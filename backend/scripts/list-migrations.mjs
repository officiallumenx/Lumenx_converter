#!/usr/bin/env node
/**
 * List Supabase migrations in apply order (for prod checklist).
 * Usage (repo root or backend/):
 *   npm run migrations:list --workspace=@lumenx/api
 */
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const dir = join(root, "supabase", "migrations");

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`Found ${files.length} migrations in ${dir}\n`);
for (const [i, file] of files.entries()) {
  console.log(`${String(i + 1).padStart(3, " ")}. ${file}`);
}
console.log(`\nApply with: supabase db push`);
console.log(`Or bundle: npm run migrations:bundle --workspace=@lumenx/api > all-migrations.sql`);
