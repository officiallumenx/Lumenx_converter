import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  checkSupabaseConnectivity,
  createRequestScopedClient,
  createSupabaseClients,
} from "../src/integrations/supabase.js";

const silentLogger = createLogger("error");

const hasLiveCreds = Boolean(
  process.env.SUPABASE_URL?.trim() &&
    process.env.SUPABASE_ANON_KEY?.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
);

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function json(res: Response): Promise<any> {
  return res.json();
}

describe("Supabase Hono wiring", () => {
  it("injects null supabase when credentials are absent", async () => {
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const app = createApp(env, silentLogger, null);

    const res = await app.request("/api/v1/health/ready");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toBe("degraded");
    expect(body.checks.supabase).toBe("not_configured");
  });

  it("keeps /api/v1/health independent of Supabase", async () => {
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const app = createApp(env, silentLogger, null);

    const res = await app.request("/api/v1/health");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body).toMatchObject({
      service: "lumenx-api",
      status: "ok",
      version: "v1",
    });
    expect(body).toHaveProperty("env");
    expect(body).toHaveProperty("release");
  });

  it("createRequestScopedClient builds a client without validating the token", () => {
    const env = loadEnv({
      NODE_ENV: "test",
      LOG_LEVEL: "error",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "anon-placeholder",
      SUPABASE_SERVICE_ROLE_KEY: "service-placeholder",
    });

    const client = createRequestScopedClient(env, "future.jwt.token");
    expect(client).toBeDefined();
  });

  it("createRequestScopedClient throws when Supabase is not configured", () => {
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    expect(() => createRequestScopedClient(env, "token")).toThrow(
      /not configured/,
    );
  });

  it("createSupabaseClients returns distinct admin and anon instances", () => {
    const env = loadEnv({
      NODE_ENV: "test",
      LOG_LEVEL: "error",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "anon-placeholder",
      SUPABASE_SERVICE_ROLE_KEY: "service-placeholder",
    });

    const clients = createSupabaseClients(env, silentLogger);
    expect(clients).not.toBeNull();
    expect(clients!.admin).not.toBe(clients!.anon);
  });
});

describe.skipIf(!hasLiveCreds)("Supabase live connectivity", () => {
  it("reaches Auth health on the linked Dev project", async () => {
    const result = await checkSupabaseConnectivity({
      url: process.env.SUPABASE_URL!,
      apikey: process.env.SUPABASE_ANON_KEY!,
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("createApp readiness reports supabase ok with live credentials", async () => {
    resetEnvCache();
    const env = loadEnv({
      NODE_ENV: "test",
      LOG_LEVEL: "error",
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
    const clients = createSupabaseClients(env, silentLogger);
    const app = createApp(env, silentLogger, clients);

    const res = await app.request("/api/v1/health/ready");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toBe("ready");
    expect(body.checks.supabase).toBe("ok");
  });
});

describe("Supabase connectivity without credentials", () => {
  it("documents skip when live credentials are unavailable", () => {
    if (hasLiveCreds) {
      expect(hasLiveCreds).toBe(true);
      return;
    }
    // Limitation: backend/.env is absent and process env has no SUPABASE_*.
    // Live connectivity tests are skipped until credentials are provided locally.
    expect(hasLiveCreds).toBe(false);
  });
});
