import { createClient } from "@supabase/supabase-js";
import * as argon2 from "argon2";
import * as jwt from "jsonwebtoken";

if (typeof window !== "undefined") {
  throw new Error(
    "⚠️ Este módulo (supabase server) não pode ser importado no client-side."
  );
}

const requiredEnvVars = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  storageBucket:
    process.env.SUPABASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
}

export const supabase = createClient(
  requiredEnvVars.supabaseUrl!,
  requiredEnvVars.supabaseServiceRoleKey!,
  { auth: { persistSession: false } }
);

type Row = Record<string, unknown>;

class CollectionRef {
  table: string;
  filters: Array<{ field: string; op: string; value: unknown }> = [];
  _limit?: number;
  _order?: { field: string; asc: boolean };
  _offset?: number;

  constructor(table: string) {
    this.table = table;
  }

  where(field: string, op: string, value: unknown) {
    this.filters.push({ field, op, value });
    return this;
  }

  limit(n: number) {
    this._limit = n;
    return this;
  }

  orderBy(field: string, dir: "asc" | "desc" = "asc") {
    this._order = { field, asc: dir === "asc" };
    return this;
  }

  offset(n: number) {
    this._offset = n;
    return this;
  }

  async get() {
    let query = supabase.from(this.table).select("*");

    for (const f of this.filters) {
      if (f.op === "==") query = query.eq(f.field, f.value);
      else if (f.op === "in") {
        if (Array.isArray(f.value))
          query = query.in(f.field, f.value as readonly unknown[]);
        else query = query.in(f.field, [f.value] as readonly unknown[]);
      } else if (f.op === ">") query = query.gt(f.field, f.value);
      else if (f.op === "<") query = query.lt(f.field, f.value);
      else query = query.eq(f.field, f.value);
    }

    if (this._order) {
      query = query.order(this._order.field, { ascending: this._order.asc });
    }

    if (typeof this._limit === "number" && typeof this._offset === "number") {
      const start = this._offset;
      const end = this._offset + this._limit - 1;
      query = query.range(start, end);
    } else if (typeof this._limit === "number") {
      query = query.limit(this._limit);
    } else if (typeof this._offset === "number") {
      query = query.range(this._offset, this._offset + 999999);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []) as Row[];
    const docs = rows.map((row) => {
      const rec = row as Record<string, unknown>;
      const possibleId = rec["id"] ?? rec["uid"] ?? rec["uuid"];
      return {
        id: possibleId ? String(possibleId) : String(row),
        data: () => snakeToCamel(row),
        get: (field: string) => rec[camelToSnake(field)],
        exists: true,
      };
    });

    return { docs, size: docs.length, empty: docs.length === 0 };
  }

  async add(payload: Record<string, unknown>) {
    const snakePayload = toSnakeKeys(payload);
    const { data, error } = await supabase
      .from(this.table)
      .insert([snakePayload])
      .select()
      .single();
    if (error) throw error;
    return { id: data.id };
  }

  doc(id: string) {
    const table = this.table;
    return {
      id,
      async get() {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        return {
          exists: !!data,
          id: data?.id,
          data: () => (data ? snakeToCamel(data) : data),
          get: (field: string) => data?.[camelToSnake(field)],
        };
      },
      async update(payload: Record<string, unknown>) {
        const snakePayload = toSnakeKeys(payload);
        const { error } = await supabase
          .from(table)
          .update(snakePayload)
          .eq("id", id);
        if (error) throw error;
        return true;
      },
    };
  }
}

export const db = {
  collection(name: string) {
    return new CollectionRef(name);
  },
  async getAll(...docRefs: Array<{ id: string; __table?: string }>) {
    if (!docRefs.length) return [];
    const results: Array<{
      exists: boolean;
      id?: string;
      data: () => unknown;
      get: (f: string) => unknown;
    }> = [];
    for (const r of docRefs) {
      const tableName = r.__table || "usuarios";
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", r.id)
        .maybeSingle();
      if (error) throw error;
      results.push({
        exists: !!data,
        id: data?.id as string | undefined,
        data: () => (data ? snakeToCamel(data) : data),
        get: (f: string) =>
          data ? data[camelToSnake(f) as string] : undefined,
      });
    }
    return results;
  },
};

export type DB = typeof db;

function camelToSnake(key: string) {
  return key.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`);
}

function snakeToCamelKey(key: string) {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toSnakeKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return (obj as unknown[]).map(toSnakeKeys);
  if (typeof obj !== "object") return obj;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    const v = (obj as Record<string, unknown>)[k];
    out[camelToSnake(k)] = toSnakeKeys(v) as unknown;
  }
  return out;
}

function snakeToCamel(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return (obj as unknown[]).map(snakeToCamel);
  if (typeof obj !== "object") return obj;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    const v = (obj as Record<string, unknown>)[k];
    out[snakeToCamelKey(k)] = snakeToCamel(v) as unknown;
  }
  return out;
}

export const storage = {
  async uploadFile(
    bucket: string,
    path: string,
    buffer: Buffer,
    contentType?: string
  ) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: contentType || "image/jpeg",
        upsert: true,
        cacheControl: "3600",
      });
    if (error) {
      console.error("Supabase Storage upload error:", error);
      throw error;
    }
    return data;
  },
  getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? "";
  },
  async removeFile(bucket: string, path: string) {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
    return true;
  },
};

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    nome: string;
    cargo: string;
    ra: string;
  };
}

export interface LoginData {
  email: string;
  senha: string;
}

export async function authenticateUser(
  loginData: LoginData
): Promise<AuthResult> {
  try {
    const { email, senha } = loginData;
    try {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });

      if (signInError) {
        return { success: false, error: "Email ou senha incorretos" };
      }

      const userId = signInData?.user?.id;

      const { data: profile, error: profileError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Error fetching user profile after sign-in:",
          profileError
        );
        return { success: false, error: "Erro interno do servidor" };
      }

      if (!profile) {
        return {
          success: true,
          user: {
            id: userId,
            email,
            nome: "",
            cargo: "",
            ra: "",
          },
        };
      }

      return {
        success: true,
        user: {
          id: profile.id,
          email: profile.email,
          nome: profile.nome,
          cargo: profile.cargo,
          ra: profile.ra,
        },
      };
    } catch (err) {
      console.error("Supabase sign-in error:", err);
      return { success: false, error: "Erro interno do servidor" };
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error authenticating user:", error);
    }
    return { success: false, error: "Erro interno do servidor" };
  }
}

export async function hashPassword(password: string): Promise<string> {
  try {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error hashing password:", error);
    }
    throw new Error("Falha ao processar senha");
  }
}

export async function createSessionToken(userId: string): Promise<string> {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET não definido.");

    const payload = {
      uid: userId,
      sessionId: `session_${Date.now()}`,
      timestamp: Date.now(),
    };

    return jwt.sign(payload, jwtSecret, {
      expiresIn: "5d",
      issuer: "atestado-stock-app",
      audience: "atestado-stock-users",
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error creating session token:", error);
    }
    throw new Error("Falha ao criar token de sessão");
  }
}

export async function verifySessionToken(
  token: string
): Promise<jwt.JwtPayload | null> {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET não definido.");

    return jwt.verify(token, jwtSecret, {
      issuer: "atestado-stock-app",
      audience: "atestado-stock-users",
    }) as jwt.JwtPayload;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error verifying session token:", error);
    }
    return null;
  }
}

export { supabase as firebaseAdmin };
