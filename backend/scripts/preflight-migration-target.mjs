/**
 * Explicit confirmation before applying schema changes to a linked/hosted project.
 *
 * Does NOT run supabase db push. It only verifies you named the intended ref.
 *
 * Usage:
 *   REMOTE_WRITE_PROJECT_REF=<ref> CONFIRM_MIGRATION_TARGET=<ref> \
 *     npm run preflight:migration -- 20261009180000_transport_trip_vehicle_date_slot_unique.sql
 *
 * Then, only if preflight exits 0:
 *   npx supabase link --project-ref <ref>   # confirm matches
 *   npx supabase db push
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadLumenxDotenv } from "./load-lumenx-dotenv.mjs";
import { extractSupabaseProjectRef } from "./assert-staging-env.mjs";
import {
  assertRemoteWriteAck,
  looksLikeHostedSupabaseUrl,
} from "./assert-remote-write-ack.mjs";

loadLumenxDotenv();

const migrationArg = process.argv[2]?.trim();
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationsDir = join(root, "supabase", "migrations");

assertRemoteWriteAck(process.env, { purpose: "migration preflight" });

const url = process.env.SUPABASE_URL?.trim() ?? "";
const envRef = extractSupabaseProjectRef(url);
const confirm = (process.env.CONFIRM_MIGRATION_TARGET ?? "").trim();
const writeRef = (process.env.REMOTE_WRITE_PROJECT_REF ?? "").trim();

if (!confirm) {
  console.error(
    "Set CONFIRM_MIGRATION_TARGET=<project-ref> to the exact project you will push migrations to.",
  );
  process.exit(1);
}
if (confirm !== writeRef || (envRef && confirm !== envRef)) {
  console.error(
    "CONFIRM_MIGRATION_TARGET must equal REMOTE_WRITE_PROJECT_REF and the SUPABASE_URL project ref.",
  );
  process.exit(1);
}
if (!looksLikeHostedSupabaseUrl(url)) {
  console.error("SUPABASE_URL is not a hosted Supabase URL; aborting preflight.");
  process.exit(1);
}

if (migrationArg) {
  const path = join(migrationsDir, migrationArg);
  if (!existsSync(path)) {
    console.error(`Migration file not found: ${migrationArg}`);
    process.exit(1);
  }
  console.log(`Migration file OK: ${migrationArg}`);
} else {
  const count = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).length;
  console.log(`Migrations directory has ${count} .sql files (no specific file named).`);
}

console.log("Preflight PASS");
console.log(`  target_ref: ${confirm}`);
console.log("Next (manual):");
console.log(`  npx supabase link --project-ref ${confirm}`);
console.log("  # verify linked ref matches, then:");
console.log("  npx supabase db push");
console.log("Review impact of the migration SQL before pushing.");
