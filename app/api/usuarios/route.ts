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

    // Check if user is admin
    const userDoc = await db.collection("usuarios").doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    if (userData?.cargo !== "ADMINISTRADOR") {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Apenas administradores podem acessar esta função.",
        },
        { status: 403 }
      );
    }

    // Get all users
    const usuariosSnapshot = await db
      .collection("usuarios")
      .orderBy("nome")
      .get();
    const usuarios = usuariosSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        nome: data.nome,
        email: data.email,
        tipo_usuario: data.cargo,
        ra_aluno: data.ra,
        created_at: data.created_at || new Date().toISOString(),
        status: data.status || "ativo",
        curso: data.curso || null,
      };
    });

    return NextResponse.json({
      success: true,
      usuarios,
    });
  } catch (error) {
    console.error("Error fetching usuarios:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
