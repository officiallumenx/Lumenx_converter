import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";

const silentLogger = createLogger("error");

const USER_ADMIN = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_ADMIN = "aa444444-4444-4444-8444-444444444444";
const SUB_A = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.user_profile = [
    {
      id: USER_ADMIN,
      display_name: "Admin",
      email: "a@x.com",
      status: "active",
      deleted_at: null,
    },
  ];
  db.institute = [
    {
      id: INST_A,
      code: "LX-A",
      name: "Alpha School",
      kind: "school",
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership = [
    {
      id: MEMBER_ADMIN,
      user_id: USER_ADMIN,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
  ];
  db.subscription = [
    {
      id: SUB_A,
      institute_id: INST_A,
      lifecycle_status: "trial_active",
      assigned_rate_inr: 12,
      active_student_count: 100,
      trial_start_at: "2026-01-01T00:00:00.000Z",
      trial_end_at: "2026-03-01T00:00:00.000Z",
      grace_ends_at: null,
      current_period_id: null,
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];
  return db;
}

function appWithDb(db: MockDb, envOverrides: Record<string, string> = {}) {
  const env = loadEnv({
    NODE_ENV: "test",
    LOG_LEVEL: "error",
    ONLINE_PAYMENT_PROVIDER: "demo",
    ...envOverrides,
  });
  return createApp(
    env,
    silentLogger,
    createMockSupabaseClients({
      tokens: { "token-admin": USER_ADMIN },
      db,
    }),
  );
}

describe("online subscription checkout (Phase 2 Step 10)", () => {
  it("creates online session then activates via demo webhook", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const checkout = await app.request("/api/v1/subscriptions/online-checkout", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        duration_months: 1,
        client_reference: "admin-ui",
      }),
    });
    expect(checkout.status).toBe(201);
    const session = (await json(checkout)).data;
    expect(session.provider).toBe("demo");
    expect(session.activatesSubscription).toBe(false);
    expect(session.providerSessionId).toMatch(/^sess_/);
    expect(db.payment).toHaveLength(1);
    expect(db.payment[0]?.method).toBe("online");
    expect(db.payment[0]?.status).toBe("recorded");

    const webhook = await app.request("/api/v1/webhooks/payments/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider_session_id: session.providerSessionId,
      }),
    });
    expect(webhook.status).toBe(200);
    expect(db.payment[0]?.status).toBe("verified");
    expect(db.renewal_record[0]?.status).toBe("paid");
    expect(db.subscription[0]?.lifecycle_status).toBe("active");
    expect(db.subscription_period).toHaveLength(1);
  });

  it("rejects online checkout when provider is none", async () => {
    const db = baseDb();
    const app = appWithDb(db, { ONLINE_PAYMENT_PROVIDER: "none" });
    const res = await app.request("/api/v1/subscriptions/online-checkout", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ institute_id: INST_A, duration_months: 1 }),
    });
    expect(res.status).toBe(400);
  });
});
