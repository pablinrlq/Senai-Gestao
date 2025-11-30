import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, db } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Token de autorização necessário" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
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

    const atestadosSnapshot = await db
      .collection("atestados")
      .orderBy("created_at", "desc")
      .get();

    const atestados = await Promise.all(
      atestadosSnapshot.docs.map(async (doc) => {
        const atestadoData = doc.data() as Record<string, unknown>;

        let usuario = null;
        const ownerId =
          typeof atestadoData.idUsuario === "string"
            ? atestadoData.idUsuario
            : typeof atestadoData.userId === "string"
            ? atestadoData.userId
            : null;
        if (ownerId) {
          const userDoc = await db.collection("usuarios").doc(ownerId).get();
          if (userDoc.exists) {
            const userData = userDoc.data() as
              | Record<string, unknown>
              | undefined;
            usuario = {
              id: userDoc.id,
              nome: typeof userData?.nome === "string" ? userData!.nome : "N/A",
              email:
                typeof userData?.email === "string" ? userData!.email : "N/A",
              ra: typeof userData?.ra === "string" ? userData!.ra : "N/A",
              turma:
                typeof userData?.turma === "string"
                  ? userData!.turma
                  : undefined,
            };
          }
        }

        const getString = (v: unknown): string | null =>
          typeof v === "string" ? v : null;

        const dataInicio =
          getString(atestadoData.dataInicio) ||
          getString(atestadoData.data_inicio);
        const dataFim =
          getString(atestadoData.dataFim) || getString(atestadoData.data_fim);
        const motivo = getString(atestadoData.motivo) || "";
        const status = getString(atestadoData.status) || "pendente";
        const imagem =
          getString(atestadoData.imagemAtestado) ||
          getString(atestadoData.imagem_atestado) ||
          getString(atestadoData.imagem_url) ||
          "";

        const createdRaw = atestadoData.createdAt ?? atestadoData.created_at;
        let createdAt = new Date().toISOString();
        try {
          if (createdRaw)
            createdAt = new Date(createdRaw as string | number).toISOString();
        } catch {}

        const observacoes_admin =
          getString(atestadoData.observacoesAdmin) ||
          getString(atestadoData.observacoes_admin) ||
          "";

        const aprovado_pedagogia_por =
          getString(atestadoData.aprovado_pedagogia_por) ||
          getString(atestadoData.aprovadoPedagogiaPor) ||
          null;
        const aprovado_pedagogia_em =
          getString(atestadoData.aprovado_pedagogia_em) ||
          getString(atestadoData.aprovadoPedagogiaEm) ||
          null;
        const aprovado_secretaria_por =
          getString(atestadoData.aprovado_secretaria_por) ||
          getString(atestadoData.aprovadoSecretariaPor) ||
          null;
        const aprovado_secretaria_em =
          getString(atestadoData.aprovado_secretaria_em) ||
          getString(atestadoData.aprovadoSecretariaEm) ||
          null;

        return {
          id: doc.id,
          data_inicio: dataInicio,
          data_fim: dataFim,
          motivo,
          status,
          imagem,
          createdAt,
          observacoes_admin,
          aprovado_pedagogia_por,
          aprovado_pedagogia_em,
          aprovado_secretaria_por,
          aprovado_secretaria_em,
          usuario,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: atestados,
    });
  } catch (error) {
    console.error("Error in admin atestados route:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
