import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, supabase } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  try {
    let token: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      // fallback to HttpOnly cookie named 'session'
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

    // Use Supabase instead of Firestore
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", decodedToken.uid)
      .maybeSingle();

    if (userError || !userData) {
      console.error("Error fetching user from Supabase:", userError);
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const cargo = String(userData?.cargo || "").toUpperCase();
    let tipo_usuario = "aluno";
    if (cargo === "ADMINISTRADOR") tipo_usuario = "administrador";
    else if (cargo === "FUNCIONARIO") tipo_usuario = "funcionario";

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        nome: userData.nome,
        tipo_usuario,
        ra_aluno: userData.ra,
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
