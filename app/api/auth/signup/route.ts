/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { CreateUserSchema } from "@/lib/validations/schemas";
import { validateRequestBody } from "@/lib/validations/helpers";
import { supabase } from "@/lib/firebase/admin";
import fs from "fs";
import path from "path";
import argon2 from "argon2";
import { sanitizeString } from "@/lib/utils/sanitize";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.cargo && body.cargo !== "USUARIO") {
      return NextResponse.json(
        {
          error:
            "Apenas alunos podem se cadastrar pela página pública. Funcionários devem ser cadastrados pelo painel administrativo.",
        },
        { status: 403 }
      );
    }

    body.cargo = "USUARIO";

    if (!body.curso || String(body.curso).trim() === "") {
      return NextResponse.json(
        { error: "Curso é obrigatório para alunos" },
        { status: 400 }
      );
    }
    if (!body.periodo || String(body.periodo).trim() === "") {
      return NextResponse.json(
        { error: "Período é obrigatório para alunos" },
        { status: 400 }
      );
    }
    if (!body.turma || String(body.turma).trim() === "") {
      return NextResponse.json(
        { error: "Turma é obrigatória para alunos" },
        { status: 400 }
      );
    }

    const validation = validateRequestBody(CreateUserSchema, body);
    if (!validation.success) return validation.response;

    const validatedData = validation.data;

    const uniqueField =
      (validatedData as any).cargo === "USUARIO" ? "ra" : "registro_empregado";
    const { data: raRow, error: raErr } = await supabase
      .from("usuarios")
      .select("id")
      .eq(uniqueField, validatedData.ra)
      .limit(1)
      .maybeSingle();

    if (raErr) {
      logger.error(
        "Error checking RA uniqueness:",
        raErr instanceof Error ? raErr.message : raErr
      );
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 }
      );
    }

    if (raRow) {
      return NextResponse.json(
        { error: "RA já está sendo usado por outro usuário" },
        { status: 409 }
      );
    }

    logger.info("Creating Supabase auth user for email", validatedData.email);
    const { data: createdUser, error: createUserError } =
      await supabase.auth.admin.createUser({
        email: validatedData.email,
        password: validatedData.senha,
        email_confirm: true,
      });

    if (createUserError) {
      logger.error(
        "Supabase createUser error:",
        createUserError instanceof Error
          ? createUserError.message
          : createUserError
      );
      let raExists = false;
      try {
        const { data: raRow2, error: raErr2 } = await supabase
          .from("usuarios")
          .select("id")
          .eq(uniqueField, validatedData.ra)
          .limit(1)
          .maybeSingle();

        if (raErr2) throw raErr2;
        if (raRow2) raExists = true;
      } catch (err) {
        logger.error(
          "Error checking RA uniqueness (supabase client):",
          err instanceof Error ? err.message : String(err)
        );
        try {
          const restUrl = `${
            process.env.SUPABASE_URL
          }/rest/v1/usuarios?select=id&${uniqueField}=eq.${encodeURIComponent(
            validatedData.ra
          )}&limit=1`;
          logger.debug("RA uniqueness: using REST fallback");
          const res = await fetch(restUrl, {
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
              Authorization: `Bearer ${
                process.env.SUPABASE_SERVICE_ROLE_KEY || ""
              }`,
              Accept: "application/json",
            },
          });
          if (!res.ok) throw new Error(`REST fallback failed: ${res.status}`);
          const json = await res.json();
          if (Array.isArray(json) && json.length > 0) raExists = true;
        } catch (restErr) {
          logger.error(
            "Error checking RA uniqueness (REST fallback):",
            restErr instanceof Error ? restErr.message : String(restErr)
          );
          return NextResponse.json(
            { error: "Erro interno do servidor" },
            { status: 500 }
          );
        }
      }

      if (raExists) {
        return NextResponse.json(
          { error: "RE/RA já está sendo usado por outro usuário" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Não foi possível criar o usuário" },
        { status: 400 }
      );
    }

    const profile: Record<string, unknown> = {
      id: createdUser.user.id,
      nome: sanitizeString(validatedData.nome),
      email: validatedData.email,
      cargo: validatedData.cargo || "USUARIO",
      ...(body.metadata && { metadata: body.metadata }),
    };

    if ((validatedData as any).cargo === "USUARIO") {
      profile.ra = sanitizeString(validatedData.ra);
    } else if (validatedData.ra) {
      profile.registro_empregado = sanitizeString(validatedData.ra);
    }

    if (validatedData.telefone) {
      profile.telefone = sanitizeString(validatedData.telefone);
    }

    if ((validatedData as any).curso) {
      profile.curso = sanitizeString((validatedData as any).curso);
    }

    if ((validatedData as any).periodo) {
      profile.periodo = sanitizeString((validatedData as any).periodo);
    }

    if (
      (validatedData as any).turma &&
      String((validatedData as any).turma).trim() !== ""
    ) {
      profile.turma = sanitizeString((validatedData as any).turma);
    }

    try {
      const hashed = await argon2.hash(validatedData.senha);
      profile.senha = hashed;
    } catch (hashErr) {
      logger.error(
        "Failed to hash password:",
        hashErr instanceof Error ? hashErr.message : String(hashErr)
      );
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 }
      );
    }

    const allowedCols = new Set([
      "id",
      "nome",
      "email",
      "cargo",
      "ra",
      "registro_empregado",
      "senha",
      "metadata",
      "telefone",
      "curso",
      "periodo",
      "turma",
    ]);

    const insertPayload: Record<string, unknown> = {};
    Object.entries(profile).forEach(([k, v]) => {
      if (allowedCols.has(k)) insertPayload[k] = v;
    });

    const removed = Object.keys(profile).filter((k) => !allowedCols.has(k));
    if (removed.length > 0) {
      logger.debug("Removed unknown columns before insert:", removed);
    }

    const { error: insertErr } = await supabase
      .from("usuarios")
      .insert([insertPayload]);
    if (insertErr) {
      logger.error("Error inserting profile:", insertErr);
      try {
        const logDir = path.join(process.cwd(), "logs");
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        const logFile = path.join(logDir, "signup-errors.log");
        const payload = {
          time: new Date().toISOString(),
          insertErr: insertErr,
          profile,
        };
        fs.appendFileSync(logFile, JSON.stringify(payload, null, 2) + "\n\n");
      } catch (fileErr) {
        logger.error("Failed to write signup error log:", fileErr);
      }
      try {
        await supabase.auth.admin.deleteUser(createdUser.user.id);
      } catch (delErr) {
        logger.error("Failed to rollback created auth user:", delErr);
      }
      return NextResponse.json(
        { error: "Erro ao criar perfil do usuário" },
        { status: 500 }
      );
    }

    const userWithoutPassword = { ...profile } as Record<string, unknown>;
    if (typeof userWithoutPassword.senha !== "undefined")
      delete userWithoutPassword.senha;

    return NextResponse.json(
      {
        success: true,
        message: "Conta criada com sucesso",
        data: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Signup error:", error);
    try {
      const logDir = path.join(process.cwd(), "logs");
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      const logFile = path.join(logDir, "signup-errors.log");
      const payload = { time: new Date().toISOString(), error };
      fs.appendFileSync(logFile, JSON.stringify(payload, null, 2) + "\n\n");
    } catch (fileErr) {
      logger.error("Failed to write signup error log (catch):", fileErr);
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
