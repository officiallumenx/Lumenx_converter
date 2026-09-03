import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";
import { PARENT_LOGIN_DEMO_OTP } from "../src/domains/parents/parent-otp.js";
import {
  clearParentLoginOtpStore,
} from "../src/domains/parents/parent-otp.js";
import {
  setOtpDeliveryFetch,
  resetOtpDeliveryFetch,
} from "../src/domains/otp-delivery/index.js";

const silentLogger = createLogger("error");

const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PARENT_A = "ba111111-1111-4111-8111-111111111111";

beforeEach(() => {
  resetEnvCache();
  resetOtpDeliveryFetch();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetOtpDeliveryFetch();
});

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.institute = [
    {
      id: INST_A,
      code: "LX-A",
      name: "Alpha",
      kind: "school",
      status: "active",
      deleted_at: null,
    },
  ];
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
  const clients = createMockSupabaseClients({ db, tokens: {} });
  return {
    app: createApp(env, silentLogger, clients),
    clients,
    db,
  };
}

describe("parent login OTP", () => {
  it("sends OTP only when institute + mobile match a parent", async () => {
    const { app, clients, db } = appWithDb(baseDb());
    await clearParentLoginOtpStore(clients.admin);

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
    expect(db.login_otp_challenge.length).toBe(1);
    expect(db.login_otp_challenge[0]?.otp_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("verify OTP returns session tokens for matched parent", async () => {
    const { app, clients } = appWithDb(baseDb());
    await clearParentLoginOtpStore(clients.admin);

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

  it("persists challenge across store calls until verified (durable)", async () => {
    const db = baseDb();
    const { app, clients } = appWithDb(db);
    await clearParentLoginOtpStore(clients.admin);

    await app.request("/api/v1/auth/parent/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        phone: "9876512345",
      }),
    });
    expect(db.login_otp_challenge).toHaveLength(1);
    const hashBefore = db.login_otp_challenge[0]?.otp_hash;

    // Cooldown window — should not rotate hash
    await app.request("/api/v1/auth/parent/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        phone: "9876512345",
      }),
    });
    expect(db.login_otp_challenge).toHaveLength(1);
    expect(db.login_otp_challenge[0]?.otp_hash).toBe(hashBefore);

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
    expect(db.login_otp_challenge).toHaveLength(0);
  });

  it("live delivery mode sends SMS webhook when requesting parent OTP", async () => {
    resetEnvCache();
    const fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
    setOtpDeliveryFetch(fetchSpy as unknown as typeof fetch);

    const env = loadEnv({
      NODE_ENV: "production",
      LOG_LEVEL: "error",
      OTP_DELIVERY_MODE: "live",
      OTP_SMS_PROVIDER: "webhook",
      OTP_SMS_WEBHOOK_URL: "https://hooks.example/parent-sms",
    });
    const db = baseDb();
    const clients = createMockSupabaseClients({ db, tokens: {} });
    await clearParentLoginOtpStore(clients.admin);
    const app = createApp(env, silentLogger, clients);

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
    expect(body.data.devOtp).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledOnce();
    const payload = JSON.parse(String((fetchSpy.mock.calls[0]![1] as RequestInit).body));
    expect(payload.purpose).toBe("parent_login");
    expect(payload.otp).toMatch(/^\d{6}$/);
    expect(db.login_otp_challenge).toHaveLength(1);

    resetOtpDeliveryFetch();
    resetEnvCache();
  });
});
