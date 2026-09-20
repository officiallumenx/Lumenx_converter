import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const env = loadEnv(join(root, ".env"));
const url = env.SUPABASE_URL || "";
const anon = env.SUPABASE_ANON_KEY || "";
const svc = env.SUPABASE_SERVICE_ROLE_KEY || "";

console.log(
  JSON.stringify(
    {
      host: url ? new URL(url).host : null,
      anon_prefix: anon.slice(0, 20),
      anon_len: anon.length,
      anon_kind: anon.startsWith("sb_publishable_")
        ? "publishable"
        : anon.startsWith("eyJ")
          ? "legacy_jwt"
          : "other",
      svc_prefix: svc.slice(0, 20),
      svc_len: svc.length,
      svc_kind: svc.startsWith("sb_secret_")
        ? "secret"
        : svc.startsWith("eyJ")
          ? "legacy_jwt"
          : "other",
    },
    null,
    2,
  ),
);
