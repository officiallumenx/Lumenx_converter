import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationsDir = join(repoRoot, "supabase", "migrations");
const migrationName = "20260909120000_connect_passwordless_login.sql";

function migrationSql(): string {
  return readFileSync(join(migrationsDir, migrationName), "utf8");
}

describe("connect passwordless login migration", () => {
  it("is ordered after identity hardening", () => {
    const migrations = readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    const hardeningIndex = migrations.indexOf(
      "20260908160000_auth_identity_security_hardening.sql",
    );
    const passwordlessIndex = migrations.indexOf(migrationName);
    expect(hardeningIndex).toBeGreaterThanOrEqual(0);
    expect(passwordlessIndex).toBeGreaterThan(hardeningIndex);
  });

  it("creates role/institute-scoped PIN credentials with service-only access", () => {
    const sql = migrationSql();

    expect(sql).toContain("CREATE TABLE public.connect_login_credential");
    expect(sql).toContain(
      "UNIQUE (user_profile_id, institute_id, role)",
    );
    expect(sql).toContain("role IN ('teacher', 'parent', 'student')");
    expect(sql).toContain("failed_attempts");
    expect(sql).toContain("locked_until");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toMatch(
      /REVOKE ALL ON TABLE public\.connect_login_credential FROM PUBLIC, anon, authenticated/,
    );
    expect(sql).toMatch(
      /GRANT SELECT, INSERT, UPDATE, DELETE ON public\.connect_login_credential TO service_role/,
    );
  });

  it("backfills from global profile PIN fields into Connect memberships", () => {
    const sql = migrationSql();

    expect(sql).toContain("INSERT INTO public.connect_login_credential");
    expect(sql).toContain("up.pin_hash");
    expect(sql).toContain("up.pin_salt");
    expect(sql).toContain("up.phone_digits");
    expect(sql).toContain("ON CONFLICT (user_profile_id, institute_id, role) DO NOTHING");
  });

  it("exposes service-only first-login and verify RPCs with lockout", () => {
    const sql = migrationSql();

    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.set_connect_login_pin");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.verify_connect_login_pin");
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("p_max_attempts");
    expect(sql).toContain("p_lock_seconds");
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.set_connect_login_pin[\s\S]*FROM PUBLIC, anon, authenticated/,
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.verify_connect_login_pin[\s\S]*TO service_role/,
    );
  });
});
