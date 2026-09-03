#!/usr/bin/env node
/**
 * Concatenate all Supabase migrations in lexicographic order for SQL Editor apply.
 * Usage:
 *   npm run migrations:bundle --workspace=@lumenx/api > all-migrations.sql
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const dir = join(root, "supabase", "migrations");

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`-- LumenX migration bundle`);
console.log(`-- Generated: ${new Date().toISOString()}`);
console.log(`-- Count: ${files.length}`);
console.log(`-- Prefer: supabase db push (linked project)`);
console.log("");

for (const file of files) {
  console.log(`-- ========== ${file} ==========`);
  console.log(readFileSync(join(dir, file), "utf8").trimEnd());
  console.log("\n");
}
