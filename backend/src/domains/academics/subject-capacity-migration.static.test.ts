/**
 * Static review of the subject capacity / class_periods migration.
 * Does NOT execute SQL against PostgreSQL.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = resolve(
  process.cwd(),
  "../supabase/migrations/20261023180000_subject_capacity_class_periods.sql",
);

describe("subject capacity class_periods migration (static SQL review)", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("is forward-only additive (no DROP of subject data)", () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS capacity/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS class_periods/i);
    expect(sql).not.toMatch(/\bDROP\s+COLUMN\b/i);
    expect(sql).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
  });

  it("defaults class_periods to empty object for legacy rows", () => {
    expect(sql).toMatch(/DEFAULT\s+'\{\}'::jsonb/i);
    expect(sql).toMatch(/NOT NULL DEFAULT/i);
  });

  it("constrains capacity to null or nonnegative", () => {
    expect(sql).toMatch(/subject_capacity_check/);
    expect(sql).toMatch(/capacity IS NULL OR capacity >= 0/);
  });

  it("documents legacy fallback semantics", () => {
    expect(sql).toMatch(/periods_per_week/i);
    expect(sql).toMatch(/Do not apply to production without authorization/i);
  });
});
