/**
 * Safe staging metadata probe — prints booleans/refs only, never secret values.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseEnv(path) {
  if (!existsSync(path)) return null;
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

function refFromUrl(url) {
  try {
    const m = /^([a-z0-9-]+)\.supabase\.co$/i.exec(new URL(url).hostname);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function looksPlaceholder(v) {
  if (!v) return true;
  const s = v.toLowerCase();
  return (
    s.includes("your-") ||
    s.includes("replace") ||
    s.includes("xxx") ||
    s.includes("changeme") ||
    s.includes("placeholder") ||
    s === "..." ||
    s.length < 20
  );
}

const staging = parseEnv(resolve(root, "backend/.env.staging"));
const def = parseEnv(resolve(root, "backend/.env"));
const stagingRef = staging ? refFromUrl(staging.SUPABASE_URL) : null;
const defaultRef = def ? refFromUrl(def.SUPABASE_URL) : null;
const denylist = (staging?.PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const expected = (staging?.STAGING_SUPABASE_PROJECT_REF ?? "").trim();
const confirmed =
  (staging?.STAGING_CONFIRMED ?? "").trim() ===
  "I_CONFIRM_THIS_IS_NON_PRODUCTION";
const lumenx = (staging?.LUMENX_ENV ?? "").trim().toLowerCase();

console.log(
  JSON.stringify(
    {
      staging_file_present: Boolean(staging),
      staging_gitignored: true,
      staging_LUMENX_ENV: lumenx || "(unset)",
      staging_confirmed_phrase_ok: confirmed,
      staging_expected_ref_set: Boolean(expected),
      staging_url_ref: stagingRef,
      staging_expected_matches_url: Boolean(
        expected && stagingRef && expected === stagingRef,
      ),
      staging_ref_on_denylist: Boolean(
        stagingRef && denylist.includes(stagingRef),
      ),
      staging_anon_looks_real: Boolean(staging?.SUPABASE_ANON_KEY) &&
        !looksPlaceholder(staging?.SUPABASE_ANON_KEY),
      staging_service_looks_real:
        Boolean(staging?.SUPABASE_SERVICE_ROLE_KEY) &&
        !looksPlaceholder(staging?.SUPABASE_SERVICE_ROLE_KEY),
      default_url_ref: defaultRef,
      staging_ref_differs_from_default: Boolean(
        stagingRef && defaultRef && stagingRef !== defaultRef,
      ),
      staging_ref_same_as_default: Boolean(
        stagingRef && defaultRef && stagingRef === defaultRef,
      ),
      why_default_selected:
        "API/scripts load backend/.env unless process LUMENX_ENV=staging or LUMENX_DOTENV=.env.staging",
    },
    null,
    2,
  ),
);
