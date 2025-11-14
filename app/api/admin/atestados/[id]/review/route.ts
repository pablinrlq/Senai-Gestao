import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, db } from "@/lib/firebase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: atestadoId } = await params;
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

    // Check if user is admin
    const userDoc = await db.collection("usuarios").doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data()?.cargo !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { status, observacoes_admin } = await req.json();

    if (!status || !["aprovado", "rejeitado"].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    // Reject without observations is not allowed
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

    // Check if atestado exists
    const atestadoDoc = await db.collection("atestados").doc(atestadoId).get();
    if (!atestadoDoc.exists) {
      return NextResponse.json(
        { error: "Atestado não encontrado" },
        { status: 404 }
      );
    }

    // Update atestado with admin review using known DB columns only
    // We avoid adding unknown columns (like reviewedAt/reviewedBy) to prevent
    // PostgREST errors when the column doesn't exist. Known columns:
    // - status
    // - observacoes_admin
    // - updated_at
    const payload: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (observacoes_admin && typeof observacoes_admin === "string") {
      payload.observacoes_admin = observacoes_admin.trim();
    }

    await db.collection("atestados").doc(atestadoId).update(payload);

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
