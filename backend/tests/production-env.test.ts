import { describe, it, expect, beforeEach } from "vitest";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import {
  assertProductionEnv,
  collectProductionEnvIssues,
  corsLooksLocalOnly,
} from "../src/config/production.js";

beforeEach(() => {
  resetEnvCache();
});

const prodBase = {
  NODE_ENV: "production",
  HOST: "0.0.0.0",
  PORT: "8787",
  CORS_ORIGINS: "https://admin.lumenx.app,https://connect.lumenx.app",
  SUPABASE_URL: "https://abc.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  FIREBASE_PROJECT_ID: "lx-prod",
  FIREBASE_CLIENT_EMAIL: "firebase@lx.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY:
    "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n",
  OTP_SMS_PROVIDER: "twilio",
  TWILIO_ACCOUNT_SID: "ACxxx",
  TWILIO_AUTH_TOKEN: "token",
  TWILIO_FROM_NUMBER: "+15551234567",
  OTP_EMAIL_PROVIDER: "none",
} as const;

describe("production packaging env gate", () => {
  it("detects localhost-only CORS", () => {
    expect(corsLooksLocalOnly(["http://localhost:5173"])).toBe(true);
    expect(corsLooksLocalOnly(["https://admin.lumenx.app"])).toBe(false);
  });

  it("accepts a complete production env via loadEnv", () => {
    const env = loadEnv({ ...prodBase });
    expect(env.NODE_ENV).toBe("production");
    expect(env.HOST).toBe("0.0.0.0");
    expect(env.CORS_ORIGINS).toContain("https://admin.lumenx.app");
    expect(() => assertProductionEnv(env, { ...prodBase })).not.toThrow();
  });

  it("defaults HOST to 0.0.0.0 in production when unset", () => {
    const { HOST: _omit, ...rest } = prodBase;
    const env = loadEnv({ ...rest, HOST: "" });
    expect(env.HOST).toBe("0.0.0.0");
  });

  it("rejects production without Supabase at boot gate", () => {
    const env = loadEnv({
      ...prodBase,
      SUPABASE_URL: "",
      SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    });
    expect(() =>
      assertProductionEnv(env, {
        ...prodBase,
        SUPABASE_URL: "",
        SUPABASE_ANON_KEY: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
      }),
    ).toThrow(/Production environment is not deploy-ready/);
  });

  it("rejects production with localhost-only CORS at boot gate", () => {
    const env = loadEnv({
      ...prodBase,
      CORS_ORIGINS: "http://localhost:5173",
    });
    expect(() =>
      assertProductionEnv(env, {
        ...prodBase,
        CORS_ORIGINS: "http://localhost:5173",
      }),
    ).toThrow(/non-localhost/);
  });

  it("rejects production when CORS_ORIGINS is not set in raw env", () => {
    const env = loadEnv({ ...prodBase });
    const issues = collectProductionEnvIssues(env, {
      NODE_ENV: "production",
    });
    expect(issues.some((i) => i.code === "CORS_ORIGINS")).toBe(true);
  });

  it("rejects production without OTP providers at boot gate", () => {
    const env = loadEnv({
      ...prodBase,
      OTP_SMS_PROVIDER: "none",
      OTP_EMAIL_PROVIDER: "none",
    });
    expect(() =>
      assertProductionEnv(env, {
        ...prodBase,
        OTP_SMS_PROVIDER: "none",
        OTP_EMAIL_PROVIDER: "none",
      }),
    ).toThrow(/OTP_PROVIDER|OTP_SMS_PROVIDER/);
  });

  it("assertProductionEnv is a no-op outside production", () => {
    const env = loadEnv({ NODE_ENV: "development" });
    expect(() => assertProductionEnv(env, {})).not.toThrow();
  });
});
