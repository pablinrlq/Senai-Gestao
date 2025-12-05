import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, db } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    // Accept token from Authorization header or from HttpOnly cookie named 'session'
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
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    if (
      !(
        userData?.cargo === "ADMINISTRADOR" || userData?.cargo === "FUNCIONARIO"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Apenas administradores ou funcionários podem acessar esta função.",
        },
        { status: 403 }
      );
    }

    const usuariosSnapshot = await db
      .collection("usuarios")
      .orderBy("nome")
      .get();
    const usuarios = usuariosSnapshot.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;

      const getString = (v: unknown): string | null =>
        typeof v === "string" ? v : null;

      return {
        id: doc.id,
        nome: getString(data.nome) || "",
        email: getString(data.email) || "",
        tipo_usuario: getString(data.cargo) || "",
        ra_aluno: getString(data.ra) || null,
        created_at: getString(data.created_at) || new Date().toISOString(),
        status: getString(data.status) || "ativo",
        curso: getString(data.curso) || null,
      };
    });

    return NextResponse.json({
      success: true,
      usuarios,
    });
  } catch (error) {
    logger.error("Error fetching usuarios:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
