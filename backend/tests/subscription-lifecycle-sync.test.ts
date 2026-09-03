import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";
import { syncSubscriptionLifecycles } from "../src/domains/subscriptions/lifecycle-sync.js";
import { flushSubscriptionLifecycles } from "../src/workers/subscription-lifecycle-runner.js";

const silentLogger = createLogger("error");

const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SUB_A = "s0111111-1111-4111-8111-111111111111";
const SUB_B = "s0222222-2222-4222-8222-222222222222";
const PERIOD_B = "p0222222-2222-4222-8222-222222222222";
const RENEWAL_A = "r0111111-1111-4111-8111-111111111111";
const USER_BILLING = "22222222-2222-4222-8222-222222222222";
const USER_SUPPORT = "33333333-3333-4333-8333-333333333333";
const OP_BILLING = "c0222222-2222-4222-8222-222222222222";
const OP_SUPPORT = "c0333333-3333-4333-8333-333333333333";

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetEnvCache();
});

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.institute = [
    {
      id: INST_A,
      code: "A",
      name: "Alpha",
      kind: "school",
      status: "active",
      deleted_at: null,
    },
    {
      id: INST_B,
      code: "B",
      name: "Beta",
      kind: "school",
      status: "active",
      deleted_at: null,
    },
  ];
  db.user_profile = [
    {
      id: USER_BILLING,
      display_name: "Billing",
      email: "billing@lx.test",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_SUPPORT,
      display_name: "Support",
      email: "support@lx.test",
      status: "active",
      deleted_at: null,
    },
  ];
  db.platform_operator = [
    {
      id: OP_BILLING,
      user_id: USER_BILLING,
      role_code: "billing",
      handle: "billing",
      display_name: "Billing",
      status: "active",
      deleted_at: null,
    },
    {
      id: OP_SUPPORT,
      user_id: USER_SUPPORT,
      role_code: "support",
      handle: "support",
      display_name: "Support",
      status: "active",
      deleted_at: null,
    },
  ];
  // Stale trial_active row — dates already past grace → should become read_only
  db.subscription = [
    {
      id: SUB_A,
      institute_id: INST_A,
      lifecycle_status: "trial_active",
      assigned_rate_inr: 12,
      active_student_count: 40,
      trial_start_at: "2026-01-01T00:00:00.000Z",
      trial_end_at: "2026-03-01T00:00:00.000Z",
      grace_ends_at: "2026-03-08T00:00:00.000Z",
      current_period_id: null,
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    // Paid current period — stays / becomes active
    {
      id: SUB_B,
      institute_id: INST_B,
      lifecycle_status: "grace_period",
      assigned_rate_inr: 12,
      active_student_count: 20,
      trial_start_at: null,
      trial_end_at: null,
      grace_ends_at: null,
      current_period_id: PERIOD_B,
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];
  db.subscription_period = [
    {
      id: PERIOD_B,
      institute_id: INST_B,
      subscription_id: SUB_B,
      duration_months: 12,
      active_student_count: 20,
      assigned_rate_inr: 12,
      monthly_price_inr: 12,
      regular_amount_inr: 144,
      discount_amount_inr: 0,
      payable_amount_inr: 144,
      free_months: 0,
      starts_at: "2026-06-01T00:00:00.000Z",
      ends_at: "2027-06-01T00:00:00.000Z",
      payment_method: "offline",
      payment_status: "paid",
      payment_ref: "PAID-1",
      amount_paid_inr: 144,
      paid_at: "2026-06-01T00:00:00.000Z",
      is_current: true,
      deleted_at: null,
      created_at: "2026-06-01T00:00:00.000Z",
      updated_at: "2026-06-01T00:00:00.000Z",
    },
  ];
  db.renewal_record = [
    {
      id: RENEWAL_A,
      institute_id: INST_A,
      subscription_id: SUB_A,
      subscription_period_id: null,
      invoice_number: "INV-OVERDUE-1",
      status: "issued",
      period_starts_at: "2026-03-01T00:00:00.000Z",
      period_ends_at: "2027-03-01T00:00:00.000Z",
      due_at: "2026-03-15T00:00:00.000Z",
      issued_at: "2026-03-01T00:00:00.000Z",
      active_student_count: 40,
      assigned_rate_inr: 12,
      regular_amount_inr: 5760,
      discount_amount_inr: 0,
      payable_amount_inr: 8000,
      amount_paid_inr: 0,
      notes: null,
      created_by_user_id: USER_BILLING,
      deleted_at: null,
      created_at: "2026-03-01T00:00:00.000Z",
      updated_at: "2026-03-01T00:00:00.000Z",
    },
  ];
  return db;
}

describe("subscription lifecycle sync", () => {
  it("advances trial_active → read_only after grace and activates paid periods", async () => {
    const db = baseDb();
    const clients = createMockSupabaseClients({ db, tokens: {} });
    const now = new Date("2026-09-03T00:00:00.000Z");

    const result = await syncSubscriptionLifecycles(clients.admin, { now });

    expect(result.scanned).toBe(2);
    expect(result.updated).toBe(2);
    expect(result.transitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subscriptionId: SUB_A,
          from: "trial_active",
          to: "read_only",
        }),
        expect.objectContaining({
          subscriptionId: SUB_B,
          from: "grace_period",
          to: "active",
        }),
      ]),
    );

    const subA = db.subscription.find((s) => s.id === SUB_A);
    const subB = db.subscription.find((s) => s.id === SUB_B);
    expect(subA?.lifecycle_status).toBe("read_only");
    expect(subB?.lifecycle_status).toBe("active");
  });

  it("marks issued renewals past due_at as overdue", async () => {
    const db = baseDb();
    const clients = createMockSupabaseClients({ db, tokens: {} });
    const now = new Date("2026-09-03T00:00:00.000Z");

    const result = await flushSubscriptionLifecycles({
      admin: clients.admin,
      now,
    });

    expect(result.renewalsMarkedOverdue).toBe(1);
    const renewal = db.renewal_record.find((r) => r.id === RENEWAL_A);
    expect(renewal?.status).toBe("overdue");
  });

  it("is idempotent when statuses already match derived values", async () => {
    const db = baseDb();
    const clients = createMockSupabaseClients({ db, tokens: {} });
    const now = new Date("2026-09-03T00:00:00.000Z");

    await syncSubscriptionLifecycles(clients.admin, { now });
    const second = await syncSubscriptionLifecycles(clients.admin, { now });

    expect(second.updated).toBe(0);
    expect(second.unchanged).toBe(2);
    expect(second.renewalsMarkedOverdue).toBe(0);
  });

  it("POST /api/nexus/subscriptions/sync-lifecycle requires commercial role", async () => {
    const db = baseDb();
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({
        db,
        tokens: {
          "token-billing": USER_BILLING,
          "token-support": USER_SUPPORT,
        },
      }),
    );

    const denied = await app.request(
      "/api/nexus/subscriptions/sync-lifecycle",
      {
        method: "POST",
        headers: { Authorization: "Bearer token-support" },
      },
    );
    expect(denied.status).toBe(403);

    const ok = await app.request("/api/nexus/subscriptions/sync-lifecycle", {
      method: "POST",
      headers: { Authorization: "Bearer token-billing" },
    });
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.data.updated).toBeGreaterThanOrEqual(1);
    expect(db.subscription.find((s) => s.id === SUB_A)?.lifecycle_status).toBe(
      "read_only",
    );
  });

  it("transitions trial_active → trial_expiring near trial end", async () => {
    const db = emptyMockDb();
    db.subscription = [
      {
        id: SUB_A,
        institute_id: INST_A,
        lifecycle_status: "trial_active",
        assigned_rate_inr: 12,
        active_student_count: 10,
        trial_start_at: "2026-08-01T00:00:00.000Z",
        trial_end_at: "2026-09-05T00:00:00.000Z",
        grace_ends_at: "2026-09-12T00:00:00.000Z",
        current_period_id: null,
        deleted_at: null,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      },
    ];
    const clients = createMockSupabaseClients({ db, tokens: {} });
    const result = await syncSubscriptionLifecycles(clients.admin, {
      now: new Date("2026-09-03T00:00:00.000Z"),
    });
    expect(result.transitions[0]?.to).toBe("trial_expiring");
    expect(db.subscription[0]?.lifecycle_status).toBe("trial_expiring");
  });

  it("transitions into grace_period after trial ends", async () => {
    const db = emptyMockDb();
    db.subscription = [
      {
        id: SUB_A,
        institute_id: INST_A,
        lifecycle_status: "trial_active",
        assigned_rate_inr: 12,
        active_student_count: 10,
        trial_start_at: "2026-01-01T00:00:00.000Z",
        trial_end_at: "2026-08-01T00:00:00.000Z",
        grace_ends_at: "2026-08-08T00:00:00.000Z",
        current_period_id: null,
        deleted_at: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ];
    const clients = createMockSupabaseClients({ db, tokens: {} });
    const result = await syncSubscriptionLifecycles(clients.admin, {
      now: new Date("2026-08-05T00:00:00.000Z"),
    });
    expect(result.transitions[0]?.to).toBe("grace_period");
  });
});

describe("SUBSCRIPTION_LIFECYCLE_SYNC_MS env", () => {
  it("defaults to one hour and accepts zero disable", () => {
    expect(loadEnv({}).SUBSCRIPTION_LIFECYCLE_SYNC_MS).toBe(3_600_000);
    resetEnvCache();
    expect(
      loadEnv({ SUBSCRIPTION_LIFECYCLE_SYNC_MS: "0" })
        .SUBSCRIPTION_LIFECYCLE_SYNC_MS,
    ).toBe(0);
  });
});
