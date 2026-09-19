import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import { hashPin } from "../src/domains/auth-credentials/repository.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";

const silentLogger = createLogger("error");
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VEHICLE_A = "ee111111-1111-4111-8111-111111111111";
const DRIVER_NEW = "d2222222-2222-4222-8222-222222222222";

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function json(res: Response): Promise<{
  data?: Record<string, unknown>;
  error?: { message?: string };
}> {
  return res.json() as Promise<{
    data?: Record<string, unknown>;
    error?: { message?: string };
  }>;
}

function pinDb(overrides: Partial<{
  assigned_vehicle_id: string | null;
  app_pin: string | null;
  status: string;
  phone: string;
}> = {}): MockDb {
  const db = emptyMockDb();
  db.institute = [
    { id: INST_A, code: "A", name: "A", kind: "school", status: "active", deleted_at: null },
  ];
  db.vehicle = [
    {
      id: VEHICLE_A,
      institute_id: INST_A,
      vehicle_number: "BUS-1",
      registration_number: "KA01AB1234",
      capacity: 40,
      status: "active",
      notes: null,
      deleted_at: null,
    },
  ];
  const pin =
    overrides.app_pin === null
      ? null
      : hashPin(overrides.app_pin ?? "1234");
  db.driver = [
    {
      id: DRIVER_NEW,
      institute_id: INST_A,
      user_profile_id: null,
      display_name: "Ravi Driver",
      phone: overrides.phone ?? "9876543210",
      license_number: "DL-99",
      license_expiry: null,
      status: overrides.status ?? "active",
      notes: null,
      assigned_vehicle_id:
        overrides.assigned_vehicle_id === undefined
          ? VEHICLE_A
          : overrides.assigned_vehicle_id,
      app_pin_hash: pin?.hash ?? null,
      app_pin_salt: pin?.salt ?? null,
      deleted_at: null,
    },
  ];
  db.user_profile = [];
  db.membership = [];
  db.membership_role = [];
  return db;
}

describe("transport driver pin-login", () => {
  it("creates account and returns session when PIN + vehicle assigned", async () => {
    const db = pinDb();
    const clients = createMockSupabaseClients({ db, tokens: {} });
    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      silentLogger,
      clients,
    );

    const res = await app.request("/api/v1/auth/transport/pin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", pin: "1234" }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data?.account_created).toBe(true);
    expect(body.data?.driver_id).toBe(DRIVER_NEW);
    expect(body.data?.institute_id).toBe(INST_A);
    expect(typeof body.data?.access_token).toBe("string");
    expect(db.driver[0]?.user_profile_id).toBeTruthy();
    expect(db.membership_role.some((r) => r.role_code === "driver")).toBe(true);
  });

  it("returns no account found without assigned vehicle", async () => {
    const db = pinDb({ assigned_vehicle_id: null });
    const clients = createMockSupabaseClients({ db, tokens: {} });
    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      silentLogger,
      clients,
    );

    const res = await app.request("/api/v1/auth/transport/pin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", pin: "1234" }),
    });
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error?.message).toMatch(/No Transport account found/i);
  });

  it("returns no account found for wrong PIN", async () => {
    const db = pinDb();
    const clients = createMockSupabaseClients({ db, tokens: {} });
    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      silentLogger,
      clients,
    );

    const res = await app.request("/api/v1/auth/transport/pin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", pin: "9999" }),
    });
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error?.message).toMatch(/No Transport account found/i);
  });

  it("returns no account found when PIN not set", async () => {
    const db = pinDb({ app_pin: null });
    const clients = createMockSupabaseClients({ db, tokens: {} });
    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      silentLogger,
      clients,
    );

    const res = await app.request("/api/v1/auth/transport/pin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", pin: "1234" }),
    });
    expect(res.status).toBe(404);
  });

  it("pin-login session can call driver-me (membership + link)", async () => {
    const db = pinDb();
    const tokens: Record<string, string> = {};
    const clients = createMockSupabaseClients({ db, tokens });
    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      silentLogger,
      clients,
    );

    const login = await app.request("/api/v1/auth/transport/pin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", pin: "1234" }),
    });
    expect(login.status).toBe(200);
    const loginBody = await json(login);
    const token = String(loginBody.data?.access_token ?? "");
    expect(token).toBeTruthy();

    const me = await app.request(
      `/api/v1/transport/drivers/me?institute_id=${INST_A}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(me.status).toBe(200);
    const meBody = await json(me);
    expect(meBody.data?.driverId).toBe(DRIVER_NEW);
  });

  it("repairs Auth user when driver profile is linked but Auth missing", async () => {
    const profileId = "c1111111-1111-4111-8111-111111111111";
    const db = pinDb();
    db.user_profile = [
      {
        id: profileId,
        display_name: "Ravi Driver",
        email: "orphan@test.invalid",
        status: "active",
        deleted_at: null,
      },
    ];
    db.driver[0]!.user_profile_id = profileId;
    const tokens: Record<string, string> = {};
    const clients = createMockSupabaseClients({ db, tokens });
    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      silentLogger,
      clients,
    );

    const res = await app.request("/api/v1/auth/transport/pin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", pin: "1234" }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data?.account_created).toBe(true);
    expect(typeof body.data?.access_token).toBe("string");
  });
});
