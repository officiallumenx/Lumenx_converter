import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";
import { clearParentLoginOtpStore, PARENT_LOGIN_DEMO_OTP } from "../src/domains/parents/parent-otp.js";

const silentLogger = createLogger("error");

const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PARENT_A = "ba111111-1111-4111-8111-111111111111";

beforeEach(() => {
  resetEnvCache();
  clearParentLoginOtpStore();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
  clearParentLoginOtpStore();
});

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.parent = [
    {
      id: PARENT_A,
      institute_id: INST_A,
      user_profile_id: null,
      legacy_code: null,
      name: "Rohan Parent",
      phone: "9876512345",
      email: null,
      address: null,
      invite_status: "pending",
      access_status: "active",
      created_at: "2026-06-01T10:00:00Z",
      updated_at: "2026-06-01T10:00:00Z",
      deleted_at: null,
    },
  ];
  return db;
}

function appWithDb(db: MockDb) {
  const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
  return createApp(env, silentLogger, createMockSupabaseClients({ db, tokens: {} }));
}

describe("parent login OTP", () => {
  it("sends OTP only when institute + mobile match a parent", async () => {
    const app = appWithDb(baseDb());

    const miss = await app.request("/api/v1/auth/parent/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        phone: "9000000000",
      }),
    });
    expect(miss.status).toBe(404);

    const hit = await app.request("/api/v1/auth/parent/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        phone: "9876512345",
      }),
    });
    expect(hit.status).toBe(200);
    const body = await hit.json();
    expect(body.data.displayName).toBe("Rohan Parent");
    expect(body.data.devOtp).toBe(PARENT_LOGIN_DEMO_OTP);
  });

  it("verify OTP returns session tokens for matched parent", async () => {
    const app = appWithDb(baseDb());

    await app.request("/api/v1/auth/parent/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        phone: "9876512345",
      }),
    });

    const bad = await app.request("/api/v1/auth/parent/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        phone: "9876512345",
        otp: "000000",
      }),
    });
    expect(bad.status).toBe(400);

    const ok = await app.request("/api/v1/auth/parent/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        phone: "9876512345",
        otp: PARENT_LOGIN_DEMO_OTP,
      }),
    });
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.data.access_token).toMatch(/^access-/);
    expect(body.data.institute_id).toBe(INST_A);
  });
});
