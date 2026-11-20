/**
 * Write gitignored apps/transport/.env.staging.local from backend/.env.staging
 * for Capacitor/Vite --mode staging. Never prints secret values.
 *
 * Usage:
 *   node --env-file=backend/.env.staging qa-artifacts/prepare-transport-staging-env.mjs
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertStagingEnv,
  extractSupabaseProjectRef,
} from "../backend/scripts/assert-staging-env.mjs";

const EXPECTED = "yveadybpntziyryxsrsu";
const DENIED = "kmpzflsurepjwqnfqyld";

assertStagingEnv(process.env);
const url = (process.env.SUPABASE_URL || "").trim();
const ref = extractSupabaseProjectRef(url);
if (ref !== EXPECTED) {
  console.error(`BLOCKED: ref ${ref} != ${EXPECTED}`);
  process.exit(2);
}
if (ref === DENIED) {
  console.error("BLOCKED: denylist");
  process.exit(2);
}

const apiBase =
  (process.env.E2E_API_BASE_URL || "").trim() ||
  (process.env.SMOKE_API_BASE_URL || "").trim() ||
  "http://127.0.0.1:8787";

if (/lumenxtech\.in|kmpzflsurepjwqnfqyld/i.test(apiBase)) {
  console.error("BLOCKED: API base looks like production");
  process.exit(2);
}

const anon = (process.env.SUPABASE_ANON_KEY || "").trim();
if (!anon) {
  console.error("BLOCKED: missing SUPABASE_ANON_KEY");
  process.exit(2);
}

const outPath = resolve("apps/transport/.env.staging.local");
const body = [
  "# Generated for Transport Capacitor staging builds — gitignored",
  "# Do not commit. Do not point at production.",
  `VITE_API_BASE_URL=${apiBase}`,
  `VITE_SUPABASE_URL=${url}`,
  `VITE_SUPABASE_ANON_KEY=${anon}`,
  "VITE_TRANSPORT_AUTH_MODE=api",
  "VITE_AUTH_PROVIDER=supabase",
  "",
].join("\n");

writeFileSync(outPath, body, "utf8");
console.log(
  JSON.stringify({
    wrote: "apps/transport/.env.staging.local",
    api_host: new URL(apiBase).host,
    supabase_ref: ref,
    anon_set: true,
  }),
);
