import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";
import {
  deriveSubscriptionLifecycle,
  shouldEnforceSubscriptionReadOnly,
} from "../src/domains/subscriptions/lifecycle.js";
import { resolveInstituteWriteGate } from "../src/domains/subscriptions/write-gate.js";

const silentLogger = createLogger("error");

const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ADMIN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_A = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SUB_A = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const TOKEN = "token-admin";

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetEnvCache();
});

describe("subscription lifecycle write policy", () => {
  it("blocks read_only and registered; allows trial/grace/active", () => {
    expect(shouldEnforceSubscriptionReadOnly("read_only")).toBe(true);
    expect(shouldEnforceSubscriptionReadOnly("registered")).toBe(true);
    expect(shouldEnforceSubscriptionReadOnly("trial_active")).toBe(false);
    expect(shouldEnforceSubscriptionReadOnly("grace_period")).toBe(false);
    expect(shouldEnforceSubscriptionReadOnly("active")).toBe(false);
  });

  it("derives read_only after grace ends", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const status = deriveSubscriptionLifecycle(
      {
        lifecycleStatus: "trial_active",
        trialStartAt: "2026-01-01T00:00:00.000Z",
        trialEndAt: "2026-03-01T00:00:00.000Z",
        graceEndsAt: "2026-03-08T00:00:00.000Z",
        currentPeriod: null,
      },
      now,
    );
    expect(status).toBe("read_only");
    expect(shouldEnforceSubscriptionReadOnly(status)).toBe(true);
  });

  it("paid current period stays active", () => {
    const now = new Date("2026-06-15T00:00:00.000Z");
    const status = deriveSubscriptionLifecycle(
      {
        lifecycleStatus: "read_only",
        trialStartAt: null,
        trialEndAt: null,
        graceEndsAt: null,
        currentPeriod: {
          startsAt: "2026-06-01T00:00:00.000Z",
          endsAt: "2026-07-01T00:00:00.000Z",
          paymentStatus: "paid",
        },
      },
      now,
    );
    expect(status).toBe("active");
  });
});

function baseDb(lifecycle: string): MockDb {
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
  db.user_profile = [
    {
      id: USER_ADMIN,
      display_name: "Admin",
      email: "admin@school.test",
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership = [
    {
      id: MEMBER_A,
      user_id: USER_ADMIN,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership_role = [
    { membership_id: MEMBER_A, role_code: "institute_admin" },
  ];
  db.subscription = [
    {
      id: SUB_A,
      institute_id: INST_A,
      lifecycle_status: lifecycle,
      assigned_rate_inr: 12,
      active_student_count: 10,
      trial_start_at:
        lifecycle === "read_only" ? "2025-01-01T00:00:00.000Z" : "2026-08-01T00:00:00.000Z",
      trial_end_at:
        lifecycle === "read_only" ? "2025-03-01T00:00:00.000Z" : "2026-12-01T00:00:00.000Z",
      grace_ends_at:
        lifecycle === "read_only" ? "2025-03-08T00:00:00.000Z" : "2026-12-08T00:00:00.000Z",
      current_period_id: null,
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];
  return db;
}

describe("subscription write-gate HTTP", () => {
  it("blocks student create when institute is read_only", async () => {
    const db = baseDb("read_only");
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({
        db,
        tokens: { [TOKEN]: USER_ADMIN },
      }),
    );

    const gate = await resolveInstituteWriteGate(
      createMockSupabaseClients({ db, tokens: {} }).admin,
      INST_A,
    );
    expect(gate.writeLocked).toBe(true);

    const res = await app.request("/api/v1/students", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        first_name: "Aanya",
        surname: "Shah",
      }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error?.details?.reason).toBe("SUBSCRIPTION_READ_ONLY");
  });

  it("allows student create during trial_active", async () => {
    const db = baseDb("trial_active");
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({
        db,
        tokens: { [TOKEN]: USER_ADMIN },
      }),
    );

    const res = await app.request("/api/v1/students", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        first_name: "Aanya",
        surname: "Shah",
      }),
    });
    // May be 201 or domain validation — must not be subscription 403
    expect(res.status).not.toBe(403);
  });

  it("allows offline payment submit path while read_only", async () => {
    const db = baseDb("read_only");
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({
        db,
        tokens: { [TOKEN]: USER_ADMIN },
      }),
    );

    const res = await app.request("/api/v1/subscriptions/offline-payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        duration_months: 12,
        reference_id: "UPI-TEST-1",
      }),
    });
    // Allowlisted — not blocked by write-gate (may fail later for business reasons)
    expect(res.status).not.toBe(403);
  });

  it("allows GET list while read_only", async () => {
    const db = baseDb("read_only");
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({
        db,
        tokens: { [TOKEN]: USER_ADMIN },
      }),
    );

    const res = await app.request(
      `/api/v1/students?institute_id=${INST_A}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } },
    );
    expect(res.status).not.toBe(403);
  });
});
