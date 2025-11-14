import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, db } from "@/lib/firebase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
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

    // Only admins can change status
    const userDoc = await db.collection("usuarios").doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data()?.cargo !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await req.json();
    const { status } = body as { status?: string };
    if (!status || !["ativo", "inativo"].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    // Check target user exists
    const targetDoc = await db.collection("usuarios").doc(userId).get();
    if (!targetDoc.exists) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Update only known columns
    const payload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    try {
      await db.collection("usuarios").doc(userId).update(payload);
    } catch (err) {
      console.error("Error updating user status:", err);
      return NextResponse.json(
        { error: "Falha ao atualizar status do usuário" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Usuário atualizado para ${status}`,
    });
  } catch (error) {
    console.error("Error in admin user status route:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
