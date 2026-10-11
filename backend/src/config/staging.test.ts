import { describe, expect, it } from "vitest";
import {
  STAGING_CONFIRMATION_PHRASE,
  collectStagingEnvIssues,
  extractSupabaseProjectRef,
} from "./staging.js";

describe("staging env guard", () => {
  it("extracts supabase project refs", () => {
    expect(
      extractSupabaseProjectRef("https://abcdefghijklmnop.supabase.co"),
    ).toBe("abcdefghijklmnop");
    expect(extractSupabaseProjectRef("http://127.0.0.1:54321")).toBeNull();
  });

  it("ignores non-staging environments", () => {
    expect(
      collectStagingEnvIssues({
        LUMENX_ENV: "development",
        SUPABASE_URL: "https://prodref1234567890ab.supabase.co",
      }),
    ).toEqual([]);
  });

  it("requires confirmation, matching ref, and rejects denylisted refs", () => {
    const ref = "stagingref1234567890";
    const issues = collectStagingEnvIssues({
      LUMENX_ENV: "staging",
      STAGING_CONFIRMED: "nope",
      STAGING_SUPABASE_PROJECT_REF: "otherref",
      SUPABASE_URL: `https://${ref}.supabase.co`,
      PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST: ref,
    });
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("STAGING_CONFIRMED");
    expect(codes).toContain("STAGING_SUPABASE_PROJECT_REF_MISMATCH");
    expect(codes).toContain("PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST");
  });

  it("passes a correctly confirmed staging project", () => {
    const ref = "stagingref1234567890";
    expect(
      collectStagingEnvIssues({
        LUMENX_ENV: "staging",
        STAGING_CONFIRMED: STAGING_CONFIRMATION_PHRASE,
        STAGING_SUPABASE_PROJECT_REF: ref,
        SUPABASE_URL: `https://${ref}.supabase.co`,
        SUPABASE_ANON_KEY: "anon-placeholder",
        SUPABASE_SERVICE_ROLE_KEY: "service-placeholder",
        PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST: "prodrefonly000000000",
      }),
    ).toEqual([]);
  });
});
