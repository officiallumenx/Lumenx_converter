#!/usr/bin/env node
/**
 * Inject gitignored google-services.json for FCM-enabled Android apps.
 *
 * Env (one per app, raw JSON or base64). NEVER log values:
 *   GOOGLE_SERVICES_JSON_CONNECT
 *   GOOGLE_SERVICES_JSON_ADMIN
 *   GOOGLE_SERVICES_JSON_TRANSPORT
 *   GOOGLE_SERVICES_JSON_CAREERS
 *
 * Usage:
 *   node scripts/inject-google-services.mjs
 *   node scripts/inject-google-services.mjs --app connect
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const APPS = {
  connect: {
    env: "GOOGLE_SERVICES_JSON_CONNECT",
    path: "apps/connect/android/app/google-services.json",
  },
  admin: {
    env: "GOOGLE_SERVICES_JSON_ADMIN",
    path: "apps/admin/android/app/google-services.json",
  },
  transport: {
    env: "GOOGLE_SERVICES_JSON_TRANSPORT",
    path: "apps/transport/android/app/google-services.json",
  },
  careers: {
    env: "GOOGLE_SERVICES_JSON_CAREERS",
    path: "apps/careers/android/app/google-services.json",
  },
};

function decodePayload(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) return trimmed;
  try {
    return Buffer.from(trimmed, "base64").toString("utf8");
  } catch {
    throw new Error("Value must be raw JSON or base64-encoded JSON");
  }
}

function injectOne(key) {
  const spec = APPS[key];
  if (!spec) throw new Error(`Unknown app: ${key}`);
  const raw = process.env[spec.env];
  if (!raw?.trim()) {
    console.info(`[inject-google-services] skip ${key}: ${spec.env} not set`);
    return false;
  }
  const json = decodePayload(raw);
  // Validate shape without logging contents.
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== "object" || !parsed.project_info) {
    throw new Error(`${spec.env} is not a valid google-services.json payload`);
  }
  const out = join(root, spec.path);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, json.endsWith("\n") ? json : `${json}\n`, "utf8");
  console.info(`[inject-google-services] wrote ${spec.path} (${json.length} bytes)`);
  return true;
}

const appArgIdx = process.argv.indexOf("--app");
const only = appArgIdx >= 0 ? process.argv[appArgIdx + 1] : null;
const keys = only ? [only] : Object.keys(APPS);
let written = 0;
for (const key of keys) {
  if (injectOne(key)) written += 1;
}
if (written === 0 && only) {
  console.error(`[inject-google-services] ${APPS[only]?.env ?? only} is required`);
  process.exit(1);
}
process.exit(0);
