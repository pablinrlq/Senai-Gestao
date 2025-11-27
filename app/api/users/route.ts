import { NextResponse } from "next/server";
import {
  withFirebaseAdmin,
  safeFirestoreOperation,
} from "@/lib/firebase/middleware";
import { CreateUserSchema } from "@/lib/validations/schemas";
import { validateRequestBody, handleZodError } from "@/lib/validations/helpers";

export const GET = withFirebaseAdmin(async (req, db) => {
  const { data, error } = await safeFirestoreOperation(async () => {
    const snapshot = await db.collection("usuarios").get();
    return snapshot.docs.map((doc: { id: string; data: () => unknown }) => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>),
    }));
  }, "Failed to fetch users");

  if (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
});

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

    const { data, error } = await safeFirestoreOperation(async () => {
      const payload: Record<string, unknown> = {
        nome: validatedData.nome,
        email: validatedData.email,
        cargo: validatedData.cargo,
        telefone: validatedData.telefone,
        senha: validatedData.senha,
        createdAt: new Date().toISOString(),
      };

      if (validatedData.cargo === "USUARIO") {
        payload.ra = validatedData.ra;
      } else if (validatedData.ra) {
        payload.registro_empregado = validatedData.ra;
      }

      if (validatedData.curso) payload.curso = validatedData.curso;
      if (validatedData.periodo) payload.periodo = validatedData.periodo;
      if (validatedData.turma) payload.turma = validatedData.turma;

      const docRef = await db.collection("usuarios").add(payload);
      return { id: docRef.id };
    }, "Failed to create user");

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Usuário criado com sucesso",
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleZodError(error);
  }
});
