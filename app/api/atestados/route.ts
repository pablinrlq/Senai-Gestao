import { NextRequest, NextResponse } from "next/server";
import {
  withFirebaseAdmin,
  safeFirestoreOperation,
} from "@/lib/firebase/middleware";
import {
  CreateAtestadoSchema,
  UpdateAtestadoStatusSchema,
  User,
} from "@/lib/validations/schemas";
import { ZodError } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/authMiddleware";
import {
  uploadImageToStorage,
  uploadImageToPublicFolder,
} from "@/lib/firebase/storage";

/**
 * ===============================
 * 🔹 GET /api/atestados
 * ===============================
 * Lista todos os atestados (com paginação e filtros)
 */
export const GET = withFirebaseAdmin(async (req, db) => {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  if (page < 1 || limit < 1 || limit > 100) {
    return NextResponse.json(
      { error: "Parâmetros de paginação inválidos" },
      { status: 400 }
    );
  }

  const authResult = await verifyAuth(req);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const currUser = await db.collection("usuarios").doc(authResult.uid).get();
  if (!currUser.exists) {
    return NextResponse.json(
      { error: "Usuário não encontrado" },
      { status: 404 }
    );
  }

  // Determine o userId efetivo (se não informado, usar o id do usuário atual)
  const requestedUserId = userId ?? currUser.id;

  // Se for usuário comum, só pode listar seus próprios atestados
  if (currUser.get("cargo") === "USUARIO" && requestedUserId !== currUser.id) {
    return NextResponse.json(
      { error: "Usuário não autorizado a acessar esses atestados" },
      { status: 403 }
    );
  }

  const { data, error } = await safeFirestoreOperation(async () => {
    let atestadosQuery: FirebaseFirestore.Query = db.collection("atestados");

    // Se o cliente solicitou explicitamente um userId aplique o filtro;
    // além disso, para usuários comuns sempre filtrar pelos próprios atestados.
    if (userId || currUser.get("cargo") === "USUARIO") {
      atestadosQuery = atestadosQuery.where(
        "id_usuario",
        "==",
        requestedUserId
      );
    }
    if (status) {
      atestadosQuery = atestadosQuery.where("status", "==", status);
    }

    const totalSnapshot = await atestadosQuery.get();
    const total = totalSnapshot.size;

    // Paginação e ordenação (use o nome de coluna do Postgres: created_at)
    const paginatedQuery = atestadosQuery
      .orderBy("created_at", "desc")
      .offset(offset)
      .limit(limit);
    const atestadosSnapshot = await paginatedQuery.get();

    // Buscar usuários relacionados
    const userIds = Array.from(
      new Set(atestadosSnapshot.docs.map((doc) => doc.data().id_usuario))
    );
    const userDocs = await db.getAll(
      ...userIds.map((id) => db.collection("usuarios").doc(id))
    );
    const usuarios = new Map<
      string,
      Pick<User, "id" | "nome" | "email" | "ra">
    >();
    userDocs.forEach((doc) => {
      if (doc.exists) {
        usuarios.set(doc.id, {
          id: doc.id,
          nome: doc.get("nome"),
          email: doc.get("email"),
          ra: doc.get("ra"),
        });
      }
    });

    const atestados = atestadosSnapshot.docs.map((doc) => {
      const data = doc.data();
      const usuario = usuarios.get(data.id_usuario);
      const toDateSafe = (v: any) => {
        if (!v) return null;
        if (typeof v === "string" || v instanceof String)
          return new Date(v as string);
        if (v?.toDate) return v.toDate();
        return new Date(v as any);
      };
      return {
        id: doc.id,
        motivo: data.motivo,
        imagem: data.imagem_atestado || "",
        status: data.status || "pendente",
        data_inicio: toDateSafe(data.data_inicio),
        data_fim: toDateSafe(data.data_fim),
        usuario: usuario ?? null,
        // manter compatibilidade com frontend usando `createdAt`
        createdAt: toDateSafe(data.created_at ?? data.createdAt),
      };
    });

    const totalPages = Math.ceil(total / limit);
    return {
      data: atestados,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }, "Falha ao buscar atestados");

  if (error)
    return NextResponse.json({ success: false, error }, { status: 500 });
  return NextResponse.json({ success: true, ...data });
});

/**
 * ===============================
 * 🔹 POST /api/atestados
 * ===============================
 * Cria um novo atestado
 */
export const POST = withFirebaseAdmin(async (req, db) => {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const formData = await req.formData();

    const data = {
      data_inicio: formData.get("data_inicio"),
      data_fim: formData.get("data_fim"),
      motivo: formData.get("motivo"),
      status: formData.get("status") || "pendente",
      imagem_atestado: formData.get("imagem_atestado"),
    };

    const validationResult = CreateAtestadoSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: validationResult.error.errors.map(
            (e) => `${e.path.join(".")}: ${e.message}`
          ),
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Verifica se o usuário existe
    const userDoc = await db.collection("usuarios").doc(authResult.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    let imageUrl = "";
    let imagePath = "";

    // Upload da imagem (caso exista)
    const imageFile = formData.get("imagem_atestado");
    if (imageFile && imageFile instanceof File) {
      try {
        if (process.env.HAS_STORAGE_BUCKET === "true") {
          const uploadResult = await uploadImageToStorage(
            imageFile,
            authResult.uid,
            "atestados"
          );
          imageUrl = uploadResult.url;
          imagePath = uploadResult.path;
        } else {
          const uploadResult = await uploadImageToPublicFolder(
            imageFile,
            authResult.uid,
            "atestados"
          );
          imageUrl = uploadResult.url;
          imagePath = uploadResult.path;
        }
      } catch (uploadError) {
        console.error("Erro ao fazer upload da imagem:", uploadError);
        return NextResponse.json(
          { error: "Falha ao enviar imagem do atestado" },
          { status: 500 }
        );
      }
    }

    const { data: createdData, error } = await safeFirestoreOperation(
      async () => {
        const docRef = await db.collection("atestados").add({
          id_usuario: authResult.uid,
          data_inicio: Timestamp.fromDate(new Date(validatedData.data_inicio)),
          data_fim: Timestamp.fromDate(new Date(validatedData.data_fim)),
          motivo: validatedData.motivo,
          imagem_atestado: imageUrl,
          imagem_path: imagePath,
          status: validatedData.status,
          createdAt: Timestamp.fromDate(new Date()),
        });
        return { id: docRef.id };
      },
      "Falha ao criar atestado"
    );

    if (error)
      return NextResponse.json({ success: false, error }, { status: 500 });

    return NextResponse.json(
      {
        success: true,
        message: "Atestado criado com sucesso",
        data: createdData,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        },
        { status: 400 }
      );
    }
    console.error("Erro interno:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
});

/**
 * ===============================
 * 🔹 PATCH /api/atestados?id=...
 * ===============================
 * Atualiza o status de um atestado (para admin)
 */
export const PATCH = withFirebaseAdmin(async (req, db) => {
  try {
    const { searchParams } = new URL(req.url);
    const atestadoId = searchParams.get("id");
    if (!atestadoId) {
      return NextResponse.json(
        { error: "ID do atestado é obrigatório" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validationResult = UpdateAtestadoStatusSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: validationResult.error.errors.map(
            (e) => `${e.path.join(".")}: ${e.message}`
          ),
        },
        { status: 400 }
      );
    }

    const atestadoDoc = await db.collection("atestados").doc(atestadoId).get();
    if (!atestadoDoc.exists) {
      return NextResponse.json(
        { error: "Atestado não encontrado" },
        { status: 404 }
      );
    }

    const { error } = await safeFirestoreOperation(async () => {
      await db
        .collection("atestados")
        .doc(atestadoId)
        .update({
          status: validationResult.data.status,
          updatedAt: Timestamp.fromDate(new Date()),
        });
    }, "Falha ao atualizar status do atestado");

    if (error) return NextResponse.json({ error }, { status: 500 });

    return NextResponse.json({
      success: true,
      message: "Status do atestado atualizado com sucesso",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        },
        { status: 400 }
      );
    }
    console.error("Erro interno:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
});
