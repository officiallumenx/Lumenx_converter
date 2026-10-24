/**
 * Configure gitignored backend/.env.staging for a newly created staging project.
 * Never prints secret values. Usage:
 *   node qa-artifacts/configure-staging-env.mjs <project-ref>
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ref = (process.argv[2] || "").trim();
const DENY = "kmpzflsurepjwqnfqyld";

if (!ref || ref === DENY) {
  console.error("Usage: node qa-artifacts/configure-staging-env.mjs <NEW_STAGING_REF>");
  process.exit(1);
}

const stagingPath = resolve(root, "backend/.env.staging");
const examplePath = resolve(root, "backend/.env.staging.example");

function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function runApiKeys(projectRef) {
  const r = spawnSync(
    "npx",
    [
      "supabase",
      "projects",
      "api-keys",
      "--project-ref",
      projectRef,
      "--reveal",
      "-o",
      "json",
    ],
    {
      cwd: root,
      encoding: "utf8",
      shell: true,
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  if (r.status !== 0) {
    console.error("api-keys failed:", r.status);
    console.error((r.stderr || "").slice(0, 500));
    process.exit(1);
  }
  const text = stripBom(r.stdout || "");
  // stdout may include npm warn lines — extract JSON array/object
  const start = text.indexOf("[") >= 0 ? text.indexOf("[") : text.indexOf("{");
  if (start < 0) {
    console.error("api-keys: no JSON in stdout");
    process.exit(1);
  }
  return JSON.parse(text.slice(start));
}

function pickKey(keys, names) {
  const list = Array.isArray(keys) ? keys : keys.keys || [];
  for (const want of names) {
    const hit = list.find((k) => {
      const n = String(k.name || k.id || k.type || "").toLowerCase();
      return n === want || n.includes(want);
    });
    const val = hit?.api_key || hit?.key || hit?.value;
    if (val) return String(val);
  }
  return null;
}

const keys = runApiKeys(ref);
const anon = pickKey(keys, ["anon", "publishable"]);
const service = pickKey(keys, ["service_role", "service-role", "secret"]);

if (!anon || !service) {
  const names = (Array.isArray(keys) ? keys : []).map((k) => k.name || k.id || k.type);
  console.error("Could not resolve anon/service keys. Names seen:", names);
  process.exit(1);
}

if (!existsSync(stagingPath) && existsSync(examplePath)) {
  copyFileSync(examplePath, stagingPath);
}

let body = existsSync(stagingPath)
  ? readFileSync(stagingPath, "utf8")
  : readFileSync(examplePath, "utf8");

function upsert(content, key, value) {
  const re = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  if (re.test(content)) return content.replace(re, line);
  return content.trimEnd() + `\n${line}\n`;
}

body = upsert(body, "LUMENX_ENV", "staging");
body = upsert(body, "STAGING_CONFIRMED", "I_CONFIRM_THIS_IS_NON_PRODUCTION");
body = upsert(body, "STAGING_SUPABASE_PROJECT_REF", ref);
body = upsert(body, "PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST", DENY);
body = upsert(body, "SUPABASE_URL", `https://${ref}.supabase.co`);
body = upsert(body, "SUPABASE_ANON_KEY", anon);
body = upsert(body, "SUPABASE_SERVICE_ROLE_KEY", service);
body = upsert(body, "OTP_DELIVERY_MODE", "demo");
body = upsert(body, "FCM_WORKER_ENABLED", "false");
body = upsert(body, "FCM_ALLOW_PROD_OUTBOX", "false");

writeFileSync(stagingPath, body, "utf8");

console.log(
  JSON.stringify(
    {
      staging_file: "backend/.env.staging",
      staging_ref: ref,
      denylist: DENY,
      anon_len: anon.length,
      service_len: service.length,
      url_host: `${ref}.supabase.co`,
      wrote: true,
    },
    null,
    2,
  ),
);
