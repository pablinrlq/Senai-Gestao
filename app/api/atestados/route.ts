import { NextResponse } from "next/server";
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
import * as fs from "fs-extra";
import * as path from "path";
import { verifyAuth } from "@/lib/authMiddleware";
import {
  uploadImageToStorage,
  uploadImageToPublicFolder,
} from "@/lib/firebase/storage";

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

  const requestedUserId = userId ?? currUser.id;

  if (currUser.get("cargo") === "USUARIO" && requestedUserId !== currUser.id) {
    return NextResponse.json(
      { error: "Usuário não autorizado a acessar esses atestados" },
      { status: 403 }
    );
  }

  const { data, error } = await safeFirestoreOperation(async () => {
    let atestadosQuery = db.collection("atestados");

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

    const paginatedQuery = atestadosQuery
      .orderBy("created_at", "desc")
      .offset(offset)
      .limit(limit);
    const atestadosSnapshot = await paginatedQuery.get();

    const userIds = Array.from(
      new Set(
        atestadosSnapshot.docs
          .map((doc) => {
            const d = doc.data() as Record<string, unknown>;
            return (d["id_usuario"] ?? d["idUsuario"]) as string | undefined;
          })
          .filter(Boolean)
      )
    ).filter(Boolean) as string[];

    const validUserIds = userIds.filter(
      (id) => typeof id === "string" && id.length > 0
    );
    const userDocs = validUserIds.length
      ? await db.getAll(
          ...validUserIds.map((id) => db.collection("usuarios").doc(id))
        )
      : [];
    const usuarios = new Map<
      string,
      Pick<User, "id" | "nome" | "email" | "ra">
    >();
    userDocs.forEach(
      (doc: { exists: boolean; id?: string; get: (f: string) => unknown }) => {
        if (doc.exists && doc.id) {
          usuarios.set(doc.id, {
            id: doc.id,
            nome: String(doc.get("nome") ?? ""),
            email: String(doc.get("email") ?? ""),
            ra: String(doc.get("ra") ?? ""),
          });
        }
      }
    );

    const atestados = await Promise.all(
      atestadosSnapshot.docs.map(
        async (doc: {
          id: string;
          data: () => unknown;
          get: (f: string) => unknown;
          exists: boolean;
        }) => {
          const data = doc.data() as Record<string, unknown>;
          const usuario = usuarios.get(
            (data["id_usuario"] ?? data["idUsuario"]) as string
          );

          const rawImageValue =
            data["imagemAtestado"] ??
            data["imagem_atestado"] ??
            data["imagem_url"] ??
            "";
          const rawImage =
            typeof rawImageValue === "string" ? rawImageValue : "";
          let imageUrl = "";
          try {
            if (rawImage && rawImage.startsWith("/uploads/")) {
              const rel = rawImage.replace(/^\//, "");
              const fullPath = path.join(process.cwd(), "public", rel);
              const exists = await fs.pathExists(fullPath);
              if (exists) imageUrl = rawImage;
            } else {
              imageUrl = rawImage;
            }

            if (
              !imageUrl &&
              rawImage &&
              !rawImage.startsWith("/") &&
              !rawImage.startsWith("http") &&
              !rawImage.startsWith("data:")
            ) {
              const base64Candidate = rawImage.replace(/\s+/g, "");
              const base64Regex =
                /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
              if (
                base64Candidate.length > 100 &&
                base64Regex.test(base64Candidate)
              ) {
                imageUrl = `data:image/jpeg;base64,${base64Candidate}`;
              }
            }
          } catch {
            imageUrl = "";
          }

          const toDateOrString = (v: unknown): string | null => {
            if (!v) return null;
            if (typeof v === "string") return v;
            const maybeWithToDate = v as { toDate?: () => Date } | undefined;
            if (maybeWithToDate && typeof maybeWithToDate.toDate === "function")
              return maybeWithToDate.toDate().toISOString();
            try {
              const dt = new Date(v as string | number | Date);
              if (isNaN(dt.getTime())) return null;
              return dt.toISOString();
            } catch {
              return null;
            }
          };

          return {
            id: doc.id,
            motivo: data.motivo,
            imagem: imageUrl,
            status: data.status || "pendente",
            observacoes_admin:
              data.observacoes_admin || data.observacoesAdmin || null,
            data_inicio: toDateOrString(data.data_inicio ?? data.dataInicio),
            data_fim: toDateOrString(data.data_fim ?? data.dataFim),
            periodo_afastamento:
              typeof data.periodo_afastamento === "number"
                ? data.periodo_afastamento
                : data.periodo_afastamento
                ? parseInt(String(data.periodo_afastamento), 10)
                : null,
            usuario: usuario ?? null,
            createdAt: toDateOrString(data.created_at ?? data.createdAt),
          };
        }
      )
    );

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

    const periodoAfastamentoStr = formData.get("periodo_afastamento");
    const periodoAfastamento = periodoAfastamentoStr
      ? parseInt(periodoAfastamentoStr as string, 10)
      : undefined;

    console.log("[API] Received form data:", {
      data_inicio: formData.get("data_inicio"),
      periodo_afastamento: periodoAfastamento,
      motivo: formData.get("motivo"),
      status: formData.get("status"),
      has_image: formData.has("imagem_atestado"),
    });

    if (!periodoAfastamento || isNaN(periodoAfastamento)) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: [
            "periodo_afastamento: Período de afastamento é obrigatório e deve ser um número válido",
          ],
        },
        { status: 400 }
      );
    }

    const data = {
      data_inicio: formData.get("data_inicio") as string,
      periodo_afastamento: periodoAfastamento,
      motivo: (formData.get("motivo") as string) || "",
      status: (formData.get("status") as string) || "pendente",
      imagem_atestado: formData.get("imagem_atestado") as File | undefined,
    };

    const validationResult = CreateAtestadoSchema.safeParse(data);
    if (!validationResult.success) {
      console.error("[API] Validation failed:", validationResult.error.errors);
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

    const userDoc = await db.collection("usuarios").doc(authResult.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    let imageUrl = "";
    let imagePath = "";

    const imageFile = formData.get("imagem_atestado");
    if (imageFile && imageFile instanceof File) {
      console.log("[API] Processing image upload:", {
        fileName: imageFile.name,
        fileType: imageFile.type,
        fileSize: imageFile.size,
        userId: authResult.uid,
      });

      try {
        const uploadResult = await uploadImageToStorage(
          imageFile,
          authResult.uid,
          "atestados"
        );
        imageUrl = uploadResult.url;
        imagePath = uploadResult.path;
        console.log("[API] Image uploaded successfully:", {
          imageUrl,
          imagePath,
        });
      } catch (uploadError) {
        console.error(
          "[API] Erro ao enviar imagem para Supabase Storage:",
          uploadError
        );
        console.error("[API] Upload error details:", {
          message:
            uploadError instanceof Error
              ? uploadError.message
              : "Unknown error",
          stack: uploadError instanceof Error ? uploadError.stack : undefined,
        });

        try {
          console.log("[API] Attempting fallback upload to public folder...");
          const fallback = await uploadImageToPublicFolder(
            imageFile,
            authResult.uid,
            "atestados"
          );
          imageUrl = fallback.url;
          imagePath = fallback.path;
          console.log("[API] Fallback upload successful:", {
            imageUrl,
            imagePath,
          });
        } catch (fallbackErr) {
          console.error(
            "[API] Erro no fallback de upload para pasta pública:",
            fallbackErr
          );
          return NextResponse.json(
            { error: "Falha ao enviar imagem do atestado" },
            { status: 500 }
          );
        }
      }
    } else {
      console.warn("[API] No image file provided or invalid file type");
    }

    const { data: createdData, error } = await safeFirestoreOperation(
      async () => {
        const startDate = new Date(validatedData.data_inicio);
        const endDate = new Date(startDate);
        endDate.setDate(
          startDate.getDate() + validatedData.periodo_afastamento - 1
        );
        const dataFim = endDate.toISOString().split("T")[0];

        const payload: Record<string, unknown> = {
          id_usuario: authResult.uid,
          data_inicio: validatedData.data_inicio,
          data_fim: dataFim,
          motivo: validatedData.motivo,
          imagem_atestado: imageUrl,
          imagem_path: imagePath,
          status: validatedData.status,
          created_at: new Date().toISOString(),
        };

        // Include periodo_afastamento only if present to avoid DB errors when column doesn't exist
        if (
          typeof validatedData.periodo_afastamento !== "undefined" &&
          validatedData.periodo_afastamento !== null
        ) {
          payload.periodo_afastamento = validatedData.periodo_afastamento;
        }

        const docRef = await db.collection("atestados").add(payload);
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
      await db.collection("atestados").doc(atestadoId).update({
        status: validationResult.data.status,
        updated_at: new Date().toISOString(),
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
