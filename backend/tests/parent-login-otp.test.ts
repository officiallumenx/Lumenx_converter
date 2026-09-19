import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
} from "./helpers/mock-supabase.js";

const silentLogger = createLogger("error");
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("legacy parent auth retirement", () => {
  it("rejects retired parent OTP endpoints in favor of Connect passwordless", async () => {
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const clients = createMockSupabaseClients({ db: emptyMockDb(), tokens: {} });
    const app = createApp(env, silentLogger, clients);

    const request = await app.request("/api/v1/auth/parent/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        phone: "9876512345",
      }),
    });
    expect(request.status).toBe(400);
    const requestBody = await request.json();
    expect(String(requestBody.error?.message ?? "")).toMatch(/Connect passwordless/i);

    const verify = await app.request("/api/v1/auth/parent/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        phone: "9876512345",
        otp: "123456",
      }),
    });
    expect(verify.status).toBe(400);
    const verifyBody = await verify.json();
    expect(String(verifyBody.error?.message ?? "")).toMatch(/Connect passwordless/i);
  });
});
