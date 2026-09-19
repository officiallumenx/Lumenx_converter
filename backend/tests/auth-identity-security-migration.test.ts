import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationsDir = join(repoRoot, "supabase", "migrations");
const migrationName = "20260908160000_auth_identity_security_hardening.sql";

function migrationSql(): string {
  return readFileSync(join(migrationsDir, migrationName), "utf8");
}

describe("auth identity security migration", () => {
  it("is ordered before its dependent auth migrations", () => {
    const migrations = readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    const hardeningIndex = migrations.indexOf(migrationName);
    expect(hardeningIndex).toBeGreaterThanOrEqual(0);
    expect(
      migrations.indexOf("20260908170000_signup_and_registration_durability.sql"),
    ).toBeGreaterThan(hardeningIndex);
    expect(
      migrations.indexOf("20260908190000_nexus_login_verification_grants.sql"),
    ).toBeGreaterThan(hardeningIndex);
  });

  it("backfills canonical phones without failing on duplicate identities", () => {
    const sql = migrationSql();

    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.canonical_phone_digits");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS phone_digits");
    expect(sql).toContain("public.user_profile_phone_collision");
    expect(sql).toContain("duplicate_count > 1");
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS user_profile_phone_digits_uidx[\s\S]*WHERE phone_digits IS NOT NULL AND deleted_at IS NULL/,
    );
  });

  it("limits authenticated profile updates to non-verification fields", () => {
    const sql = migrationSql();

    expect(sql).toContain(
      "REVOKE UPDATE ON TABLE public.user_profile FROM authenticated",
    );
    expect(sql).toMatch(
      /GRANT UPDATE \(display_name, phone, avatar_url\) ON public\.user_profile\s+TO authenticated/,
    );
    for (const field of [
      "status",
      "firebase_uid",
      "username",
      "pin_hash",
      "pin_salt",
      "pin_set_at",
      "first_login_completed_at",
      "phone_verified_at",
      "email_verified_at",
    ]) {
      expect(sql).toContain(`NEW.${field} IS DISTINCT FROM OLD.${field}`);
    }
  });

  it("provides service-only atomic challenge and grant consumption", () => {
    const sql = migrationSql();

    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("public.consume_login_otp_challenge");
    expect(sql).toContain("public.consume_auth_verification_grant");
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.consume_login_otp_challenge[\s\S]*FROM PUBLIC, anon, authenticated/,
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.consume_auth_verification_grant[\s\S]*TO service_role/,
    );
  });

  it("requires an active institute in shared membership helpers", () => {
    const sql = migrationSql();
    const helperSection = sql.slice(sql.indexOf("CREATE OR REPLACE FUNCTION public.is_institute_member"));

    expect(helperSection).toContain("JOIN public.institute i ON i.id = m.institute_id");
    expect(helperSection.match(/i\.status = 'active'/g)).toHaveLength(2);
    expect(helperSection.match(/i\.deleted_at IS NULL/g)).toHaveLength(2);
  });
});

describe("signup and registration durability migration", () => {
  const migrationPath = join(
    migrationsDir,
    "20260908170000_signup_and_registration_durability.sql",
  );

  it("adds atomic grants, app identity, and resumable approval RPCs", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("public.app_user_identity");
    expect(sql).toContain("public.consume_signup_verification_grants");
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("public.begin_institute_registration_approval");
    expect(sql).toContain("public.finish_institute_registration_approval");
    expect(sql).toContain("'approving'");
  });
});
