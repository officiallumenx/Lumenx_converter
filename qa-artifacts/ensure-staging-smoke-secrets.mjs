/**
 * Ensure staging-only smoke/bootstrap passwords exist in backend/.env.staging.
 * Generates strong unique values when missing. Never prints secret values.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, "backend/.env.staging");

if (!existsSync(envPath)) {
  console.error("Missing backend/.env.staging");
  process.exit(1);
}

const raw = readFileSync(envPath, "utf8");
const lines = raw.split(/\r?\n/);

function get(key) {
  for (const line of lines) {
    if (line.startsWith(`${key}=`)) {
      return line.slice(key.length + 1).trim();
    }
  }
  return "";
}

function set(key, value) {
  const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
  const next = `${key}=${value}`;
  if (idx >= 0) lines[idx] = next;
  else {
    if (lines.length && lines[lines.length - 1] !== "") lines.push("");
    lines.push(next);
  }
}

function strongPassword() {
  // URL-safe; meets typical complexity without special shell metacharacters.
  return `LxStg!${randomBytes(18).toString("base64url")}`;
}

const defaults = {
  NEXUS_BOOTSTRAP_EMAIL: "lumenx.e2e.operator@lumenx.test",
  NEXUS_BOOTSTRAP_HANDLE: "staging-e2e-root",
  NEXUS_BOOTSTRAP_NAME: "Staging E2E Operator",
};

let wrote = 0;
for (const [key, value] of Object.entries(defaults)) {
  if (!get(key)) {
    set(key, value);
    wrote += 1;
  }
}

if (!get("NEXUS_BOOTSTRAP_PASSWORD")) {
  set("NEXUS_BOOTSTRAP_PASSWORD", strongPassword());
  wrote += 1;
}
if (!get("E2E_SMOKE_PASSWORD")) {
  // Align operator + smoke.* accounts on one staging-only password.
  set("E2E_SMOKE_PASSWORD", get("NEXUS_BOOTSTRAP_PASSWORD") || strongPassword());
  wrote += 1;
}

writeFileSync(envPath, `${lines.join("\n").replace(/\n+$/, "\n")}`, "utf8");
console.log(
  JSON.stringify({
    env_file: "backend/.env.staging",
    keys_ensured: [
      "NEXUS_BOOTSTRAP_EMAIL",
      "NEXUS_BOOTSTRAP_HANDLE",
      "NEXUS_BOOTSTRAP_NAME",
      "NEXUS_BOOTSTRAP_PASSWORD",
      "E2E_SMOKE_PASSWORD",
    ],
    lines_written_or_updated: wrote,
    secrets_printed: false,
  }),
);
