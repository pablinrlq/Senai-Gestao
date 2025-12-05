import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, db } from "@/lib/firebase/admin";
import { sanitizeString } from "@/lib/utils/sanitize";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: atestadoId } = await params;
    // accept token from Authorization header or HttpOnly cookie named 'session'
    let token: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      const cookieToken = req.cookies.get("session")?.value;
      if (cookieToken) token = cookieToken;
    }

    if (!token) {
      return NextResponse.json(
        { error: "Token de autorização necessário" },
        { status: 401 }
      );
    }

    const decodedToken = await verifySessionToken(token);

    if (!decodedToken || !decodedToken.uid) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const userDoc = await db.collection("usuarios").doc(decodedToken.uid).get();
    if (
      !userDoc.exists ||
      !(
        userDoc.data()?.cargo === "ADMINISTRADOR" ||
        userDoc.data()?.cargo === "FUNCIONARIO"
      )
    ) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { status, observacoes_admin } = await req.json();

    if (
      !status ||
      ![
        "aprovado_pedagogia",
        "aprovado_secretaria",
        "aprovado",
        "rejeitado",
      ].includes(status)
    ) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    if (
      status === "rejeitado" &&
      (!observacoes_admin || !observacoes_admin.trim())
    ) {
      return NextResponse.json(
        { error: "Observações são obrigatórias para rejeição" },
        { status: 400 }
      );
    }

    console.log("Atestado ID:", atestadoId);

    const atestadoDoc = await db.collection("atestados").doc(atestadoId).get();
    if (!atestadoDoc.exists) {
      return NextResponse.json(
        { error: "Atestado não encontrado" },
        { status: 404 }
      );
    }

    const atestadoData = atestadoDoc.data();
    const currentStatus = atestadoData?.status;

    console.log("Current atestado data:", {
      status: currentStatus,
      aprovado_pedagogia_por: atestadoData?.aprovado_pedagogia_por,
      aprovadoPedagogiaPor: atestadoData?.aprovadoPedagogiaPor,
      aprovado_secretaria_por: atestadoData?.aprovado_secretaria_por,
      aprovadoSecretariaPor: atestadoData?.aprovadoSecretariaPor,
    });

    // New logic: allow pedagogia/secretaria approvals in any order.
    // When both roles have approved, set final status to 'aprovado'.
    if (currentStatus === "rejeitado") {
      return NextResponse.json(
        { error: "Atestado já foi rejeitado e não pode ser alterado" },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const existingPedagogia = Boolean(
      atestadoData?.aprovado_pedagogia_por || atestadoData?.aprovadoPedagogiaPor
    );
    const existingSecretaria = Boolean(
      atestadoData?.aprovado_secretaria_por ||
        atestadoData?.aprovadoSecretariaPor
    );

    if (status === "aprovado_pedagogia") {
      if (!existingPedagogia) {
        payload.aprovado_pedagogia_por = decodedToken.uid;
        payload.aprovado_pedagogia_em = new Date().toISOString();
      }
    } else if (status === "aprovado_secretaria") {
      if (!existingSecretaria) {
        payload.aprovado_secretaria_por = decodedToken.uid;
        payload.aprovado_secretaria_em = new Date().toISOString();
      }
    } else if (status === "aprovado") {
      // Backwards-compat: if client still sends 'aprovado', treat as secretaria approval
      if (!existingSecretaria) {
        payload.aprovado_secretaria_por = decodedToken.uid;
        payload.aprovado_secretaria_em = new Date().toISOString();
      }
    } else if (status === "rejeitado") {
      payload.rejeitado_por = decodedToken.uid;
      payload.rejeitado_em = new Date().toISOString();
    }

    // Determine final status after applying new flags
    const willHavePedagogia =
      existingPedagogia || Boolean(payload.aprovado_pedagogia_por);
    const willHaveSecretaria =
      existingSecretaria || Boolean(payload.aprovado_secretaria_por);

    console.log("Approval check:", {
      existingPedagogia,
      existingSecretaria,
      newPedagogia: Boolean(payload.aprovado_pedagogia_por),
      newSecretaria: Boolean(payload.aprovado_secretaria_por),
      willHavePedagogia,
      willHaveSecretaria,
    });

    if (payload.rejeitado_por) {
      payload.status = "rejeitado";
    } else if (willHavePedagogia && willHaveSecretaria) {
      payload.status = "aprovado";
      console.log("Setting status to APROVADO (complete)");
    } else if (willHavePedagogia) {
      payload.status = "aprovado_pedagogia";
    } else if (willHaveSecretaria) {
      payload.status = "aprovado_secretaria";
    } else {
      payload.status = atestadoData?.status || "pendente";
    }

    let autoMessage = "";
    if (status === "rejeitado") {
      if (observacoes_admin && typeof observacoes_admin === "string") {
        payload.observacoes_admin = sanitizeString(observacoes_admin.trim());
      }
    } else {
      if (willHavePedagogia && willHaveSecretaria) {
        autoMessage = "Aprovado pela Pedagogia e Secretaria";
      } else if (willHavePedagogia) {
        autoMessage = "Aprovado pela Pedagogia";
      } else if (willHaveSecretaria) {
        autoMessage = "Aprovado pela Secretaria";
      }

      if (
        observacoes_admin &&
        typeof observacoes_admin === "string" &&
        observacoes_admin.trim()
      ) {
        payload.observacoes_admin = `${autoMessage}\n\nObservações: ${sanitizeString(
          observacoes_admin.trim()
        )}`;
      } else {
        payload.observacoes_admin = autoMessage;
      }
    }

    console.log("Final payload to update:", payload);

    try {
      await db.collection("atestados").doc(atestadoId).update(payload);
      console.log("Update successful, new status:", payload.status);
    } catch (unknownErr) {
      const err = unknownErr as { code?: string; message?: string };
      console.error("Error updating atestado in review route:", err);
      if (
        err &&
        err.code === "PGRST204" &&
        /observacoes_admin/.test(err.message || "")
      ) {
        return NextResponse.json(
          {
            error:
              "A coluna 'observacoes_admin' não existe na tabela 'atestados'. Por favor adicione-a antes de rejeitar um atestado.",
            fix_sql:
              "ALTER TABLE public.atestados ADD COLUMN observacoes_admin text;",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "Falha ao atualizar atestado" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Atestado ${status} com sucesso`,
    });
  } catch (error) {
    console.error("Error in admin review route:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
