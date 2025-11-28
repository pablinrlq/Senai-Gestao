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

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    const cargo = String(userData?.cargo || "").toUpperCase();
    let tipo_usuario = "aluno";
    if (cargo === "ADMINISTRADOR") tipo_usuario = "administrador";
    else if (cargo === "FUNCIONARIO") tipo_usuario = "funcionario";

    return NextResponse.json({
      success: true,
      user: {
        id: userDoc.id,
        email: userData?.email,
        nome: userData?.nome,
        tipo_usuario,
        ra_aluno: userData?.ra,
      },
    });
  } catch (error) {
    console.error("Error in profile route:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
