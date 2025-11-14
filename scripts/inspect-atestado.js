#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

// Load .env manually (no external dependency) so we can run this script
try {
  const envRaw = fs.readFileSync(".env", "utf8");
  envRaw.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) return;
    const key = m[1];
    let val = m[2] || "";
    // strip surrounding quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
} catch (e) {
  // ignore if .env not present; rely on process.env
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  "atestados";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function inspectAtestado(id) {
  try {
    const { data, error } = await supabase
      .from("atestados")
      .select("id, id_usuario, imagem_atestado, imagem_path")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar atestado:", error.message || error);
      return 2;
    }

    if (!data) {
      console.error("Atestado não encontrado com id", id);
      return 3;
    }

    console.log("Atestado:", { id: data.id, id_usuario: data.id_usuario });
    console.log("imagem_atestado:", data.imagem_atestado);
    console.log("imagem_path:", data.imagem_path);

    if (data.imagem_path) {
      console.log("\nVerificando arquivo no storage (bucket:", BUCKET + ")...");
      try {
        const path = data.imagem_path;
        const dir = path.split("/").slice(0, -1).join("/") || "/";
        const { data: list, error: listErr } = await supabase.storage
          .from(BUCKET)
          .list(dir, { limit: 100 });
        if (listErr) console.warn("List warning:", listErr.message || listErr);
        else console.log("List returned", (list || []).length, "items in", dir);

        const { data: downloadData, error: downloadErr } =
          await supabase.storage.from(BUCKET).download(path);
        if (downloadErr) {
          console.warn(
            "Download error (file may be missing or inaccessible):",
            downloadErr.message || downloadErr
          );
        } else {
          console.log(
            "Download succeeded. Size (bytes):",
            downloadData.size ?? "unknown"
          );
        }

        try {
          const publicRes = supabase.storage.from(BUCKET).getPublicUrl(path);
          console.log("getPublicUrl ->", publicRes);
        } catch (e) {
          console.warn("getPublicUrl error:", e.message || e);
        }

        try {
          const { data: signed, error: signedErr } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, 60);
          if (signedErr)
            console.warn(
              "createSignedUrl error:",
              signedErr.message || signedErr
            );
          else console.log("Signed URL (60s):", signed.signedUrl);
        } catch (e) {
          console.warn("createSignedUrl exception:", e.message || e);
        }
      } catch (e) {
        console.error("Erro ao verificar storage:", e.message || e);
        return 4;
      }
    } else {
      console.log("\nNenhum campo `imagem_path` presente neste registro.");
    }

    return 0;
  } catch (e) {
    console.error("Unexpected error:", e);
    return 5;
  }
}

(async () => {
  const [, , id] = process.argv;
  if (!id) {
    console.error("Uso: node scripts/inspect-atestado.js <atestado-id>");
    process.exit(2);
  }
  const code = await inspectAtestado(id);
  process.exit(code);
})();
