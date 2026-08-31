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
const USER_BILLING = "22222222-2222-4222-8222-222222222222";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_ADMIN = "aa444444-4444-4444-8444-444444444444";
const OP_BILLING = "c0222222-2222-4222-8222-222222222222";
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
    {
      id: USER_BILLING,
      display_name: "Billing",
      email: "bill@x.com",
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
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
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

function appWithDb(db: MockDb) {
  const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
  return createApp(
    env,
    silentLogger,
    createMockSupabaseClients({
      tokens: {
        "token-admin": USER_ADMIN,
        "token-billing": USER_BILLING,
      },
      db,
    }),
  );
}

describe("v1 subscriptions api", () => {
  it("returns quote options for institute admin", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/subscriptions/quote?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(3);
  });

  it("submits offline payment and lists pending in nexus inbox", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const submit = await app.request("/api/v1/subscriptions/offline-payments", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        duration_months: 12,
        reference_id: "UPI-TEST-001",
        proof_label: "receipt.png",
      }),
    });
    expect(submit.status).toBe(201);
    const submission = (await json(submit)).data;
    expect(submission.status).toBe("verification_pending");
    expect(submission.referenceId).toBe("UPI-TEST-001");

    const pending = await app.request("/api/nexus/billing/payments/pending", {
      headers: { Authorization: "Bearer token-billing" },
    });
    expect(pending.status).toBe(200);
    const inbox = (await json(pending)).data;
    expect(inbox.length).toBe(1);
    expect(inbox[0].paymentId).toBe(submission.paymentId);
  });

  it("verify activates subscription and creates period", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const submit = await app.request("/api/v1/subscriptions/offline-payments", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        duration_months: 1,
        reference_id: "NEFT-99",
      }),
    });
    const submission = (await json(submit)).data;

    const verify = await app.request(
      `/api/nexus/billing/payments/${submission.paymentId}/verify`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-billing" },
      },
    );
    expect(verify.status).toBe(200);

    const detail = await app.request(
      `/api/v1/subscriptions/detail?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(detail.status).toBe(200);
    const detailBody = (await json(detail)).data;
    expect(detailBody.lifecycleStatus).toBe("active");
    expect(detailBody.currentPeriod).toBeTruthy();
    expect(detailBody.pendingOfflinePayment).toBeNull();

    expect(db.subscription_period.length).toBe(1);
    expect(db.subscription[0]?.lifecycle_status).toBe("active");
    expect(db.subscription[0]?.current_period_id).toBeTruthy();
  });

  it("rejects duplicate offline submission with 409", async () => {
    const app = appWithDb(baseDb());

    const first = await app.request("/api/v1/subscriptions/offline-payments", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        duration_months: 6,
        reference_id: "REF-1",
      }),
    });
    expect(first.status).toBe(201);

    const dup = await app.request("/api/v1/subscriptions/offline-payments", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        duration_months: 6,
        reference_id: "REF-2",
      }),
    });
    expect(dup.status).toBe(409);
  });
});
