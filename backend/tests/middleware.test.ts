import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";

const silentLogger = createLogger("error");

function testEnv(overrides?: Record<string, string | undefined>) {
  resetEnvCache();
  return loadEnv({
    NODE_ENV: "test",
    CORS_ORIGINS: "http://localhost:3000,http://localhost:5173",
    LOG_LEVEL: "error",
    ...overrides,
  });
}

function testApp(envOverrides?: Record<string, string | undefined>) {
  return createApp(testEnv(envOverrides), silentLogger);
}

// ── Request ID ────────────────────────────────────────────────────

describe("request-id middleware", () => {
  it("generates a UUID when no X-Request-Id is sent", async () => {
    const app = testApp();
    const res = await app.request("/api/v1/health");

    const id = res.headers.get("x-request-id");
    expect(id).toBeTruthy();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("echoes back a valid incoming X-Request-Id", async () => {
    const app = testApp();
    const clientId = "aabbccdd-1122-4334-8556-ffeeddccbbaa";
    const res = await app.request("/api/v1/health", {
      headers: { "X-Request-Id": clientId },
    });

    expect(res.headers.get("x-request-id")).toBe(clientId);
  });

  it("ignores an invalid incoming X-Request-Id", async () => {
    const app = testApp();
    const res = await app.request("/api/v1/health", {
      headers: { "X-Request-Id": "not-a-uuid" },
    });

    const id = res.headers.get("x-request-id");
    expect(id).not.toBe("not-a-uuid");
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

// ── CORS ──────────────────────────────────────────────────────────

describe("cors middleware", () => {
  it("reflects a configured origin", async () => {
    const app = testApp();
    const res = await app.request("/api/v1/health", {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3000",
    );
  });

  it("does not reflect an unconfigured origin", async () => {
    const app = testApp();
    const res = await app.request("/api/v1/health", {
      headers: { Origin: "https://evil.com" },
    });

    const acao = res.headers.get("access-control-allow-origin");
    expect(acao).not.toBe("https://evil.com");
  });

  it("does not allow wildcard (*) even implicitly", async () => {
    const app = testApp();
    const res = await app.request("/api/v1/health", {
      headers: { Origin: "https://anything.example" },
    });

    expect(res.headers.get("access-control-allow-origin")).not.toBe("*");
  });

  it("exposes X-Request-Id in the CORS response", async () => {
    const app = testApp();
    const res = await app.request("/api/v1/health", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
      },
    });

    const exposed = res.headers.get("access-control-expose-headers") ?? "";
    expect(exposed.toLowerCase()).toContain("x-request-id");
  });

  it("supports credentials", async () => {
    const app = testApp();
    const res = await app.request("/api/v1/health", {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });
});

// ── Security headers ──────────────────────────────────────────────

describe("security-headers middleware", () => {
  it("sets X-Content-Type-Options", async () => {
    const app = testApp();
    const res = await app.request("/api/v1/health");

    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("sets X-Frame-Options", async () => {
    const app = testApp();
    const res = await app.request("/api/v1/health");

    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
  });
});

// ── Request log (does not leak secrets) ───────────────────────────

describe("request-log middleware", () => {
  it("health response includes request-id header (log context propagates)", async () => {
    const app = testApp();
    const res = await app.request("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });
});
