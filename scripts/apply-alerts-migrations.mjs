#!/usr/bin/env node
/**
 * Prints combined alerts SQL for Supabase SQL Editor when CLI migrations were blocked.
 * Usage: node scripts/apply-alerts-migrations.mjs > alerts-bundle.sql
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "supabase/migrations/20260827460100_school_alerts_foundation.sql",
  "supabase/migrations/20260827470100_platform_alert_ack.sql",
  "supabase/migrations/20260827470200_alert_fire_foundation.sql",
];

for (const file of files) {
  console.log(`-- === ${file} ===`);
  console.log(readFileSync(join(root, file), "utf8"));
  console.log("");
}
