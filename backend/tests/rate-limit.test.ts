import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
} from "./helpers/mock-supabase.js";
import {
  rateLimitMiddleware,
  resetRateLimitBuckets,
} from "../src/middleware/rate-limit.js";

const silentLogger = createLogger("error");

beforeEach(() => {
  resetEnvCache();
  resetRateLimitBuckets();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetRateLimitBuckets();
});

describe("rate limit middleware (Phase 2 Step 9)", () => {
  it("returns 429 after exceeding RATE_LIMIT_MAX", async () => {
    const env = loadEnv({
      NODE_ENV: "test",
      LOG_LEVEL: "error",
      RATE_LIMIT_MAX: "2",
      RATE_LIMIT_WINDOW_MS: "60000",
      RATE_LIMIT_AUTH_MAX: "0",
    });
    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({ tokens: {}, db: emptyMockDb() }),
    );

    const a = await app.request("/api/v1/health");
    const b = await app.request("/api/v1/health");
    const c = await app.request("/api/v1/health");
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(c.status).toBe(429);
    expect(c.headers.get("Retry-After")).toBeTruthy();
  });

  it("disables when RATE_LIMIT_MAX is 0", async () => {
    const env = loadEnv({
      NODE_ENV: "test",
      LOG_LEVEL: "error",
      RATE_LIMIT_MAX: "0",
    });
    expect(env.RATE_LIMIT_MAX).toBe(0);
    const mw = rateLimitMiddleware(env);
    expect(typeof mw).toBe("function");
  });
});
