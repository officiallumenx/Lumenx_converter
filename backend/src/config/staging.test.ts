import { describe, expect, it } from "vitest";
import {
  STAGING_CONFIRMATION_PHRASE,
  collectStagingEnvIssues,
  extractSupabaseProjectRef,
} from "./staging.js";

const STAGING_REF = "yveadybpntziyryxsrsu";
const PROD_REF = "kmpzflsurepjwqnfqyld";

function validStagingEnv(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    LUMENX_ENV: "staging",
    STAGING_CONFIRMED: STAGING_CONFIRMATION_PHRASE,
    STAGING_SUPABASE_PROJECT_REF: STAGING_REF,
    SUPABASE_URL: `https://${STAGING_REF}.supabase.co`,
    SUPABASE_ANON_KEY: "anon-placeholder",
    SUPABASE_SERVICE_ROLE_KEY: "service-placeholder",
    PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST: PROD_REF,
    FCM_WORKER_ENABLED: "false",
    FCM_ALLOW_PROD_OUTBOX: "false",
    OTP_DELIVERY_MODE: "demo",
    OTP_SMS_PROVIDER: "none",
    OTP_EMAIL_PROVIDER: "none",
    ...overrides,
  };
}

describe("staging env guard", () => {
  it("extracts supabase project refs", () => {
    expect(
      extractSupabaseProjectRef("https://abcdefghijklmnop.supabase.co"),
    ).toBe("abcdefghijklmnop");
    expect(extractSupabaseProjectRef(`https://${STAGING_REF}.supabase.co`)).toBe(
      STAGING_REF,
    );
    expect(extractSupabaseProjectRef("http://127.0.0.1:54321")).toBeNull();
    expect(extractSupabaseProjectRef("not-a-url")).toBeNull();
  });

  it("ignores non-staging environments (production startup unchanged)", () => {
    expect(
      collectStagingEnvIssues({
        LUMENX_ENV: "development",
        SUPABASE_URL: `https://${PROD_REF}.supabase.co`,
        FCM_ALLOW_PROD_OUTBOX: "true",
      }),
    ).toEqual([]);
    expect(
      collectStagingEnvIssues({
        NODE_ENV: "production",
        SUPABASE_URL: `https://${PROD_REF}.supabase.co`,
      }),
    ).toEqual([]);
  });

  it("requires confirmation, matching ref, and rejects denylisted refs", () => {
    const issues = collectStagingEnvIssues({
      LUMENX_ENV: "staging",
      STAGING_CONFIRMED: "nope",
      STAGING_SUPABASE_PROJECT_REF: "otherref",
      SUPABASE_URL: `https://${STAGING_REF}.supabase.co`,
      PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST: STAGING_REF,
    });
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("STAGING_CONFIRMED");
    expect(codes).toContain("STAGING_SUPABASE_PROJECT_REF_MISMATCH");
    expect(codes).toContain("PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST");
  });

  it("rejects production Supabase project when LUMENX_ENV=staging", () => {
    const issues = collectStagingEnvIssues(
      validStagingEnv({
        STAGING_SUPABASE_PROJECT_REF: PROD_REF,
        SUPABASE_URL: `https://${PROD_REF}.supabase.co`,
        PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST: PROD_REF,
      }),
    );
    expect(issues.map((i) => i.code)).toContain(
      "PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST",
    );
  });

  it("accepts the real staging project reference yveadybpntziyryxsrsu", () => {
    expect(collectStagingEnvIssues(validStagingEnv())).toEqual([]);
  });

  it("fails safely when Supabase configuration is missing", () => {
    const issues = collectStagingEnvIssues({
      LUMENX_ENV: "staging",
      STAGING_CONFIRMED: STAGING_CONFIRMATION_PHRASE,
      STAGING_SUPABASE_PROJECT_REF: STAGING_REF,
      PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST: PROD_REF,
    });
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("SUPABASE_URL");
    expect(codes).toContain("SUPABASE_ANON_KEY");
    expect(codes).toContain("SUPABASE_SERVICE_ROLE_KEY");
    for (const issue of issues) {
      // Messages name variable keys; must not echo credential material.
      expect(issue.message).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/);
      expect(issue.message).not.toMatch(/sk_live|Bearer\s+\S+/i);
      expect(issue.message.length).toBeGreaterThan(10);
    }
  });

  it("fails safely on malformed Supabase URL", () => {
    const issues = collectStagingEnvIssues(
      validStagingEnv({
        SUPABASE_URL: "https://example.com/not-supabase",
      }),
    );
    expect(issues.some((i) => i.code === "SUPABASE_URL")).toBe(true);
  });

  it("rejects FCM_ALLOW_PROD_OUTBOX in staging", () => {
    const issues = collectStagingEnvIssues(
      validStagingEnv({ FCM_ALLOW_PROD_OUTBOX: "true" }),
    );
    expect(issues.map((i) => i.code)).toContain("FCM_ALLOW_PROD_OUTBOX");
  });

  it("documents staging FCM disabled via env (worker false, allow-prod false)", () => {
    const env = validStagingEnv({ FCM_WORKER_ENABLED: "false" });
    expect(collectStagingEnvIssues(env)).toEqual([]);
    expect(env.FCM_WORKER_ENABLED).toBe("false");
    expect(env.FCM_ALLOW_PROD_OUTBOX).toBe("false");
  });
});
