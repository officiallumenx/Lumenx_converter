/**
 * Sync local Vite .env files for API mode from apps/admin/.env.
 * Does not print secrets. Run: node scripts/sync-api-mode-envs.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const adminEnvPath = join(root, "apps", "admin", ".env");

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

if (!existsSync(adminEnvPath)) {
  console.error("Missing apps/admin/.env — create it first with Supabase + API URL.");
  process.exit(1);
}

const admin = parseEnv(readFileSync(adminEnvPath, "utf8"));
const api = admin.VITE_API_BASE_URL || "http://127.0.0.1:8787";
const url = admin.VITE_SUPABASE_URL || "";
const key = admin.VITE_SUPABASE_ANON_KEY || "";

if (!url || !key) {
  console.error("apps/admin/.env must set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const targets = [
  {
    path: join(root, "apps", "connect", ".env"),
    body: `# Generated for API mode — do not commit
VITE_CONNECT_AUTH_MODE=api
VITE_API_BASE_URL=${api}
VITE_SUPABASE_URL=${url}
VITE_SUPABASE_ANON_KEY=${key}
VITE_CAREERS_ORIGIN=http://localhost:5176
VITE_ADMISSIONS_ORIGIN=http://localhost:5177
`,
  },
  {
    path: join(root, "apps", "nexus", ".env"),
    body: `# Generated for API mode — do not commit
VITE_NEXUS_AUTH_MODE=api
VITE_API_BASE_URL=${api}
VITE_SUPABASE_URL=${url}
VITE_SUPABASE_ANON_KEY=${key}
`,
  },
  {
    path: join(root, "apps", "transport", ".env"),
    body: `# Generated for API mode — do not commit
VITE_TRANSPORT_AUTH_MODE=api
VITE_API_BASE_URL=${api}
VITE_SUPABASE_URL=${url}
VITE_SUPABASE_ANON_KEY=${key}
`,
  },
  {
    path: join(root, "apps", "admissions", ".env"),
    body: `# Generated for API mode — do not commit
VITE_PUBLIC_APP_URL=http://localhost:5177
VITE_ADMISSIONS_AUTH_MODE=api
VITE_API_BASE_URL=${api}
VITE_SUPABASE_URL=${url}
VITE_SUPABASE_ANON_KEY=${key}
`,
  },
  {
    path: join(root, "apps", "careers", ".env"),
    body: `# Generated for API mode — do not commit
VITE_PUBLIC_APP_URL=http://localhost:5176
VITE_CAREERS_AUTH_MODE=api
VITE_API_BASE_URL=${api}
VITE_SUPABASE_URL=${url}
VITE_SUPABASE_ANON_KEY=${key}
`,
  },
];

// Ensure admin stays on api
const adminBody = readFileSync(adminEnvPath, "utf8");
const adminUpdated = adminBody.includes("VITE_ADMIN_AUTH_MODE=")
  ? adminBody.replace(/VITE_ADMIN_AUTH_MODE=.*/g, "VITE_ADMIN_AUTH_MODE=api")
  : `VITE_ADMIN_AUTH_MODE=api\n${adminBody}`;
writeFileSync(adminEnvPath, adminUpdated.endsWith("\n") ? adminUpdated : `${adminUpdated}\n`);

for (const t of targets) {
  writeFileSync(t.path, t.body);
}

console.log(`API mode env synced for ${targets.length + 1} apps (secrets not printed).`);
