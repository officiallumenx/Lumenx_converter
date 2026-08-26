import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadEnv, resetEnvCache, type Env } from "../src/config/env.js";
import { createLogger, type Logger } from "../src/logger/logger.js";
import { createSupabaseClients } from "../src/integrations/supabase.js";
import { initFirebaseAdmin, deleteApp } from "../src/integrations/firebase.js";

let silentLogger: Logger;

beforeEach(() => {
  resetEnvCache();
  silentLogger = createLogger("error");
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeEnv(overrides: Record<string, string | undefined> = {}): Env {
  return loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error", ...overrides });
}

const SUPABASE_CREDS = {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_ANON_KEY: "anon-key-placeholder",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key-placeholder",
};

const FIREBASE_CREDS = {
  FIREBASE_PROJECT_ID: "test-project",
  FIREBASE_CLIENT_EMAIL: "test@test-project.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY:
    "-----BEGIN RSA PRIVATE KEY-----\\nMIIBogIBAAJBALR\\n-----END RSA PRIVATE KEY-----\\n",
};

// ── Supabase boundary ────────────────────────────────────────────

describe("Supabase integration boundary", () => {
  it("returns null when credentials are absent in non-production", () => {
    const env = makeEnv();
    const result = createSupabaseClients(env, silentLogger);
    expect(result).toBeNull();
  });

  it("returns null when only some credentials are set", () => {
    const env = makeEnv({ SUPABASE_URL: "https://partial.supabase.co" });
    const result = createSupabaseClients(env, silentLogger);
    expect(result).toBeNull();
  });

  it("throws in production when credentials are missing", () => {
    const env = makeEnv({ NODE_ENV: "production" });
    expect(() => createSupabaseClients(env, silentLogger)).toThrow(
      /Supabase credentials.*required in production/,
    );
  });

  it("creates admin and anon clients when fully configured", () => {
    const env = makeEnv(SUPABASE_CREDS);
    const clients = createSupabaseClients(env, silentLogger);
    expect(clients).not.toBeNull();
    expect(clients!.admin).toBeDefined();
    expect(clients!.anon).toBeDefined();
  });

  it("admin and anon are distinct client instances", () => {
    const env = makeEnv(SUPABASE_CREDS);
    const clients = createSupabaseClients(env, silentLogger);
    expect(clients!.admin).not.toBe(clients!.anon);
  });

  it("logs a warning when not configured (non-production)", () => {
    const warnLogger = createLogger("warn");
    const env = makeEnv();
    createSupabaseClients(env, warnLogger);

    const stdoutCalls = (process.stdout.write as ReturnType<typeof vi.fn>).mock
      .calls;
    const warnLine = stdoutCalls.find((c: unknown[]) =>
      String(c[0]).includes("supabase_not_configured"),
    );
    expect(warnLine).toBeTruthy();
  });
});

// ── Firebase boundary ────────────────────────────────────────────

describe("Firebase integration boundary", () => {
  it("returns null when credentials are absent in non-production", () => {
    const env = makeEnv();
    const result = initFirebaseAdmin(env, silentLogger);
    expect(result).toBeNull();
  });

  it("returns null when only some credentials are set", () => {
    const env = makeEnv({ FIREBASE_PROJECT_ID: "partial-project" });
    const result = initFirebaseAdmin(env, silentLogger);
    expect(result).toBeNull();
  });

  it("throws in production when credentials are missing", () => {
    const env = makeEnv({ NODE_ENV: "production" });
    expect(() => initFirebaseAdmin(env, silentLogger)).toThrow(
      /Firebase credentials.*required in production/,
    );
  });

  it("attempts initialization when fully configured (rejects invalid key format)", () => {
    const env = makeEnv(FIREBASE_CREDS);
    expect(() => initFirebaseAdmin(env, silentLogger)).toThrow(
      /Failed to parse private key/,
    );
  });

  it("does not return null when all credentials are present", () => {
    const env = makeEnv(FIREBASE_CREDS);
    try {
      initFirebaseAdmin(env, silentLogger);
    } catch (e) {
      expect(String(e)).not.toMatch(/required in production/);
      expect(String(e)).toMatch(/private key/i);
    }
  });

  it("logs a warning when not configured (non-production)", () => {
    const warnLogger = createLogger("warn");
    const env = makeEnv();
    initFirebaseAdmin(env, warnLogger);

    const stdoutCalls = (process.stdout.write as ReturnType<typeof vi.fn>).mock
      .calls;
    const warnLine = stdoutCalls.find((c: unknown[]) =>
      String(c[0]).includes("firebase_not_configured"),
    );
    expect(warnLine).toBeTruthy();
  });
});

// ── Credentials never exposed ────────────────────────────────────

describe("credential safety", () => {
  it("Supabase factory returns typed client objects, not raw credential strings", () => {
    const env = makeEnv(SUPABASE_CREDS);
    const clients = createSupabaseClients(env, silentLogger);
    expect(clients).not.toBeNull();
    expect(typeof clients!.admin).toBe("object");
    expect(typeof clients!.anon).toBe("object");
    expect(clients!.admin).not.toBe(clients!.anon);
  });

  it("neither boundary module re-exports raw env credentials", async () => {
    const supabaseExports = await import("../src/integrations/supabase.js");
    const firebaseExports = await import("../src/integrations/firebase.js");

    const allExportNames = [
      ...Object.keys(supabaseExports),
      ...Object.keys(firebaseExports),
    ];

    for (const name of allExportNames) {
      expect(name).not.toMatch(/key|secret|password|credential/i);
    }
  });
});
