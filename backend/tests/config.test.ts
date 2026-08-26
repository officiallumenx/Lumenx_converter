import { describe, it, expect, beforeEach } from "vitest";
import { loadEnv, resetEnvCache } from "../src/config/env.js";

beforeEach(() => {
  resetEnvCache();
});

describe("loadEnv", () => {
  it("returns defaults when no env vars are provided", () => {
    const env = loadEnv({});
    expect(env.NODE_ENV).toBe("development");
    expect(env.HOST).toBe("127.0.0.1");
    expect(env.PORT).toBe(8787);
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.CORS_ORIGINS).toEqual([
      "http://localhost:3000",
      "http://localhost:5173",
    ]);
  });

  it("parses PORT as a number", () => {
    const env = loadEnv({ PORT: "9000" });
    expect(env.PORT).toBe(9000);
    expect(typeof env.PORT).toBe("number");
  });

  it("splits CORS_ORIGINS into an array", () => {
    const env = loadEnv({ CORS_ORIGINS: "https://a.com, https://b.com" });
    expect(env.CORS_ORIGINS).toEqual(["https://a.com", "https://b.com"]);
  });

  it("treats blank Supabase/Firebase values as undefined", () => {
    const env = loadEnv({
      SUPABASE_URL: "",
      SUPABASE_ANON_KEY: "   ",
      SUPABASE_SERVICE_ROLE_KEY: "",
      FIREBASE_PROJECT_ID: "",
      FIREBASE_CLIENT_EMAIL: "  ",
      FIREBASE_PRIVATE_KEY: "",
    });
    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.SUPABASE_ANON_KEY).toBeUndefined();
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(env.FIREBASE_PROJECT_ID).toBeUndefined();
    expect(env.FIREBASE_CLIENT_EMAIL).toBeUndefined();
    expect(env.FIREBASE_PRIVATE_KEY).toBeUndefined();
  });

  it("preserves valid optional values", () => {
    const env = loadEnv({
      SUPABASE_URL: "https://abc.supabase.co",
      FIREBASE_PROJECT_ID: "my-project",
    });
    expect(env.SUPABASE_URL).toBe("https://abc.supabase.co");
    expect(env.FIREBASE_PROJECT_ID).toBe("my-project");
  });

  it("rejects an invalid NODE_ENV", () => {
    expect(() => loadEnv({ NODE_ENV: "staging" })).toThrow(
      "Invalid environment configuration",
    );
  });

  it("rejects an invalid PORT", () => {
    expect(() => loadEnv({ PORT: "-1" })).toThrow(
      "Invalid environment configuration",
    );
  });

  it("rejects an invalid LOG_LEVEL", () => {
    expect(() => loadEnv({ LOG_LEVEL: "trace" })).toThrow(
      "Invalid environment configuration",
    );
  });

  it("caches the result on the first call (no overrides)", () => {
    const a = loadEnv();
    const b = loadEnv();
    expect(a).toBe(b);
  });

  it("does not cache when overrides are provided", () => {
    const a = loadEnv({ PORT: "3000" });
    const b = loadEnv({ PORT: "4000" });
    expect(a.PORT).toBe(3000);
    expect(b.PORT).toBe(4000);
  });
});
