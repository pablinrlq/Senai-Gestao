import { NextResponse } from "next/server";
import {
  withFirebaseAdmin,
  safeFirestoreOperation,
} from "@/lib/firebase/middleware";
import { CreateUserSchema } from "@/lib/validations/schemas";
import { validateRequestBody } from "@/lib/validations/helpers";
import { hashPassword, supabase } from "@/lib/firebase/admin";
import argon2 from "argon2";

// POST /api/admin/create-user - Admin creates new user (admin or staff)
export const POST = withFirebaseAdmin(async (req, db) => {
  try {
    // Note: In production, implement proper JWT authentication here
    // For now, we'll rely on client-side checks

    const body = await req.json();

    // Validate request body with Zod
    const validation = validateRequestBody(CreateUserSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const validatedData = validation.data;

    // Check if user already exists
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

    // Check if RA already exists
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

    // Create Supabase Auth user so the new account can authenticate via Supabase
    console.log("Admin creating Supabase auth user for:", validatedData.email);
    const { data: createdUser, error: createUserError } =
      await supabase.auth.admin.createUser({
        email: validatedData.email,
        password: validatedData.senha,
        email_confirm: true,
      } as any);

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
      const userData: any = {
        id: uid,
        nome: validatedData.nome,
        email: validatedData.email,
        cargo: validatedData.cargo,
        ...(validatedData.telefone ? { telefone: validatedData.telefone } : {}),
        ra: validatedData.ra,
        senha: await hashPassword(validatedData.senha),
        // set status explicitly (defaulted by schema to 'ativo' if not provided)
        status: validatedData.status || "ativo",
        ...(validatedData.curso ? { curso: validatedData.curso } : {}),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Store any additional metadata
        ...(body.metadata && { metadata: body.metadata }),
      };

      const docRef = await db.collection("usuarios").add(userData);
      return { id: docRef.id, ...userData };
    }, "Failed to create user");

    if (error) {
      // Rollback created Supabase auth user if profile insertion failed
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

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { senha, ...userWithoutPassword } = data;

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
