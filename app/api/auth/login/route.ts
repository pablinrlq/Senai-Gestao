import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, supabase } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";
import { LoginSchema } from "@/lib/validations/schemas";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validationResult = LoginSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(
        (error) => `${error.path.join(".")}: ${error.message}`
      );

      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: errorMessages,
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;
    logger.debug("Login data validated for:", { email: validatedData.email });

    try {
      const credentials: { email: string; password: string } = {
        email: validatedData.email,
        password: validatedData.senha,
      };

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword(credentials);

      if (signInError) {
        return NextResponse.json(
          { error: "Email ou senha incorretos" },
          { status: 401 }
        );
      }

      const userId = signInData?.user?.id;

      const { data: profile, error: profileError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        logger.error("Error fetching profile after sign-in:", profileError);
      }

      const token = await createSessionToken(userId);

      const safeProfileObj = profile
        ? ({ ...profile } as Record<string, unknown>)
        : ({ id: userId, email: validatedData.email } as Record<
            string,
            unknown
          >);
      if (typeof safeProfileObj.senha !== "undefined")
        delete safeProfileObj.senha;

      const res = NextResponse.json({
        success: true,
        message: "Login realizado com sucesso",
        user: safeProfileObj,
        token,
        supabaseSession: signInData?.session ?? null,
      });

      res.cookies.set("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return res;
    } catch (err) {
      logger.error("Error during Supabase signIn:", err);
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in login route:", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
