import { NextResponse } from "next/server";
import {
  withFirebaseAdmin,
  safeFirestoreOperation,
} from "@/lib/firebase/middleware";
import { CreateUserSchema } from "@/lib/validations/schemas";
import { validateRequestBody } from "@/lib/validations/helpers";
import { hashPassword, supabase } from "@/lib/firebase/admin";
import { sanitizeString } from "@/lib/utils/sanitize";

export const POST = withFirebaseAdmin(async (req, db) => {
  try {
    const body = await req.json();

    const validation = validateRequestBody(CreateUserSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const validatedData = validation.data;

    const existingUserSnapshot = await db
      .collection("usuarios")
      .where("email", "==", validatedData.email)
      .limit(1)
      .get();

    if (!existingUserSnapshot.empty) {
      return NextResponse.json(
        { error: "Usuário com este email já existe" },
        { status: 409 }
      );
    }

    if (validatedData.cargo === "USUARIO") {
      const existingRASnapshot = await db
        .collection("usuarios")
        .where("ra", "==", validatedData.ra)
        .limit(1)
        .get();

      if (!existingRASnapshot.empty) {
        return NextResponse.json(
          { error: "RA já está sendo usado por outro usuário" },
          { status: 409 }
        );
      }
    } else {
      if (validatedData.ra) {
        const existingRESnapshot = await db
          .collection("usuarios")
          .where("registro_empregado", "==", validatedData.ra)
          .limit(1)
          .get();

        if (!existingRESnapshot.empty) {
          return NextResponse.json(
            { error: "RE já está sendo usado por outro usuário" },
            { status: 409 }
          );
        }
      }
    }

    console.log("Admin creating Supabase auth user for:", validatedData.email);
    const { data: createdUser, error: createUserError } =
      await supabase.auth.admin.createUser({
        email: validatedData.email,
        password: validatedData.senha,
        email_confirm: true,
      });

    if (createUserError) {
      console.error(
        "Supabase createUser error (admin create):",
        createUserError
      );
      return NextResponse.json(
        { error: createUserError.message || "Erro ao criar usuário no Auth" },
        { status: 400 }
      );
    }

    const uid = createdUser?.user?.id;

    const { data, error } = await safeFirestoreOperation(async () => {
      const bodyUnknown = body as Record<string, unknown> | null;
      const userData: Record<string, unknown> = {
        id: uid,
        nome: sanitizeString(validatedData.nome),
        email: validatedData.email,
        cargo: validatedData.cargo,
        ...(validatedData.telefone
          ? { telefone: sanitizeString(validatedData.telefone) }
          : {}),
        ...(validatedData.cargo === "USUARIO"
          ? { ra: sanitizeString(validatedData.ra) }
          : {}),
        senha: await hashPassword(validatedData.senha),
        status: validatedData.status || "ativo",
        ...(validatedData.curso
          ? { curso: sanitizeString(validatedData.curso) }
          : {}),
        ...(validatedData.turma
          ? { turma: sanitizeString(validatedData.turma) }
          : {}),
        ...(validatedData.cargo !== "USUARIO" && validatedData.ra
          ? { registro_empregado: sanitizeString(validatedData.ra) }
          : {}),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(bodyUnknown?.metadata ? { metadata: bodyUnknown.metadata } : {}),
      };

      const docRef = await db.collection("usuarios").add(userData);
      return { id: docRef.id, ...userData };
    }, "Failed to create user");

    if (error) {
      try {
        if (uid) await supabase.auth.admin.deleteUser(uid);
      } catch (delErr) {
        console.error(
          "Failed to rollback created auth user (admin create):",
          delErr
        );
      }

      return NextResponse.json({ error }, { status: 500 });
    }

    const created = data as Record<string, unknown>;
    const userWithoutPassword = { ...created } as Record<string, unknown>;
    if (typeof userWithoutPassword.senha !== "undefined")
      delete userWithoutPassword.senha;

    return NextResponse.json(
      {
        success: true,
        message: "Usuário criado com sucesso",
        data: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin create user error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
});
