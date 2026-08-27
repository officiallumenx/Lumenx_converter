import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";

const silentLogger = createLogger("error");

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function testApp() {
  const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
  return createApp(env, silentLogger);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function json(res: Response): Promise<any> {
  return res.json();
}

// ── v1 namespace ─────────────────────────────────────────────────

describe("/api/v1 namespace", () => {
  it("serves health at /api/v1/health", async () => {
    const app = testApp();
    const res = await app.request("/api/v1/health");

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body).toEqual({
      service: "lumenx-api",
      status: "ok",
      version: "v1",
    });
  });

  it("returns 404 for unimplemented v1 domain routes", async () => {
    const app = testApp();
    const res = await app.request("/api/nexus/support");

    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for unknown v1 paths", async () => {
    const app = testApp();
    const res = await app.request("/api/v1/nonexistent");

    expect(res.status).toBe(404);
  });
});

// ── Nexus namespace ──────────────────────────────────────────────

describe("/api/nexus namespace", () => {
  it("serves health at /api/nexus/health", async () => {
    const app = testApp();
    const res = await app.request("/api/nexus/health");

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body).toEqual({
      service: "lumenx-nexus",
      status: "ok",
      version: "nexus",
    });
  });

  it("returns 404 for unimplemented nexus routes", async () => {
    const app = testApp();
    const res = await app.request("/api/nexus/admin");

    expect(res.status).toBe(404);
  });
});

// ── Structural separation ────────────────────────────────────────

describe("namespace separation", () => {
  it("v1 health and nexus health are distinct endpoints", async () => {
    const app = testApp();
    const v1 = await json(await app.request("/api/v1/health"));
    const nx = await json(await app.request("/api/nexus/health"));

    expect(v1.service).toBe("lumenx-api");
    expect(nx.service).toBe("lumenx-nexus");
    expect(v1.version).not.toBe(nx.version);
  });

  it("root path returns 404 (no routes outside namespaces)", async () => {
    const app = testApp();
    const res = await app.request("/");

    expect(res.status).toBe(404);
  });

  it("/api without version returns 404", async () => {
    const app = testApp();
    const res = await app.request("/api");

    expect(res.status).toBe(404);
  });

  it("middleware applies to both namespaces", async () => {
    const app = testApp();
    const v1Res = await app.request("/api/v1/health");
    const nxRes = await app.request("/api/nexus/health");

    expect(v1Res.headers.get("x-request-id")).toBeTruthy();
    expect(nxRes.headers.get("x-request-id")).toBeTruthy();
    expect(v1Res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(nxRes.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
