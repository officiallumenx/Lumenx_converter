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

const USER_ROOT = "11111111-1111-4111-8111-111111111111";
const USER_BILLING = "22222222-2222-4222-8222-222222222222";
const USER_SUPPORT = "33333333-3333-4333-8333-333333333333";
const USER_ANALYST = "66666666-6666-4666-8666-666666666666";
const USER_ADMIN = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_ADMIN = "aa444444-4444-4444-8444-444444444444";
const OP_ROOT = "c0111111-1111-4111-8111-111111111111";
const OP_BILLING = "c0222222-2222-4222-8222-222222222222";
const OP_SUPPORT = "c0333333-3333-4333-8333-333333333333";
const OP_ANALYST = "c0666666-6666-4666-8666-666666666666";
const SUB_A = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MISSING_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";

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
      id: USER_ROOT,
      display_name: "Root",
      email: "root@x.com",
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
    {
      id: USER_SUPPORT,
      display_name: "Support",
      email: "sup@x.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_ANALYST,
      display_name: "Analyst",
      email: "an@x.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_ADMIN,
      display_name: "Admin",
      email: "a@x.com",
      status: "active",
      deleted_at: null,
    },
  ];
  db.platform_operator = [
    {
      id: OP_ROOT,
      user_id: USER_ROOT,
      role_code: "nexus_root",
      handle: "root",
      display_name: "Root",
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
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
    {
      id: OP_SUPPORT,
      user_id: USER_SUPPORT,
      role_code: "support",
      handle: "support",
      display_name: "Support",
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: OP_ANALYST,
      user_id: USER_ANALYST,
      role_code: "analyst",
      handle: "analyst",
      display_name: "Analyst",
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
      name: "Alpha",
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
      lifecycle_status: "active",
      assigned_rate_inr: 49,
      active_student_count: 100,
      trial_start_at: null,
      trial_end_at: null,
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
        "token-root": USER_ROOT,
        "token-billing": USER_BILLING,
        "token-support": USER_SUPPORT,
        "token-analyst": USER_ANALYST,
        "token-admin": USER_ADMIN,
      },
      db,
    }),
  );
}

const renewalBody = {
  institute_id: INST_A,
  subscription_id: SUB_A,
  invoice_number: "INV-001",
  period_starts_at: "2026-04-01T00:00:00.000Z",
  period_ends_at: "2027-04-01T00:00:00.000Z",
  payable_amount_inr: 1000,
  regular_amount_inr: 1000,
};

describe("nexus billing api", () => {
  it("rejects institute admin from listing renewals", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/nexus/billing/renewals?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(res.status).toBe(403);
  });

  it("allows support and analyst to list but not create renewals", async () => {
    const app = appWithDb(baseDb());

    for (const token of ["token-support", "token-analyst"] as const) {
      const list = await app.request(
        `/api/nexus/billing/renewals?institute_id=${INST_A}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(list.status).toBe(200);

      const create = await app.request("/api/nexus/billing/renewals", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(renewalBody),
      });
      expect(create.status).toBe(403);
    }
  });

  it("billing role creates draft renewal and issues it", async () => {
    const app = appWithDb(baseDb());

    const created = await app.request("/api/nexus/billing/renewals", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-billing",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(renewalBody),
    });
    expect(created.status).toBe(201);
    const renewal = (await json(created)).data;
    expect(renewal.status).toBe("draft");
    expect(renewal.invoiceNumber).toBe("INV-001");

    const issued = await app.request(
      `/api/nexus/billing/renewals/${renewal.id}/issue`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-billing" },
      },
    );
    expect(issued.status).toBe(200);
    const body = await json(issued);
    expect(body.data.renewal.status).toBe("issued");
    expect(body.data.renewal.issuedAt).toBeTruthy();
    expect(body.data.pdf.signedUrl).toContain("https://");
    expect(body.data.pdf.invoiceNumber).toBe("INV-001");
  });

  it("issues invoice from subscription with PDF in one shot", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/nexus/billing/renewals/issue-invoice", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-billing",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        duration_months: 12,
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.renewal.status).toBe("issued");
    expect(body.data.renewal.invoiceNumber).toMatch(/^LX-INV-/);
    expect(body.data.pdf.signedUrl).toContain("https://");

    const pdf = await app.request(
      `/api/nexus/billing/renewals/${body.data.renewal.id}/pdf`,
      { headers: { Authorization: "Bearer token-billing" } },
    );
    expect(pdf.status).toBe(200);
    expect((await json(pdf)).data.signedUrl).toContain("https://");
  });

  it("records payment and verify marks renewal paid when full", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const created = await app.request("/api/nexus/billing/renewals", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-billing",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(renewalBody),
    });
    const renewal = (await json(created)).data;

    const payRes = await app.request("/api/nexus/billing/payments", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-billing",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        renewal_record_id: renewal.id,
        amount_inr: 1000,
        method: "offline",
      }),
    });
    expect(payRes.status).toBe(201);
    const payment = (await json(payRes)).data;
    expect(payment.status).toBe("recorded");

    const verifyRes = await app.request(
      `/api/nexus/billing/payments/${payment.id}/verify`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-billing" },
      },
    );
    expect(verifyRes.status).toBe(200);
    expect((await json(verifyRes)).data.status).toBe("verified");

    const getRenewal = await app.request(
      `/api/nexus/billing/renewals/${renewal.id}`,
      { headers: { Authorization: "Bearer token-support" } },
    );
    expect(getRenewal.status).toBe(200);
    const updated = (await json(getRenewal)).data;
    expect(updated.amountPaidInr).toBe(1000);
    expect(updated.status).toBe("paid");
  });

  it("returns 404 for missing renewal", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/nexus/billing/renewals/${MISSING_ID}`, {
      headers: { Authorization: "Bearer token-billing" },
    });
    expect(res.status).toBe(404);
  });

  it("rejects duplicate invoice_number with 409", async () => {
    const app = appWithDb(baseDb());

    const first = await app.request("/api/nexus/billing/renewals", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-billing",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(renewalBody),
    });
    expect(first.status).toBe(201);

    const dup = await app.request("/api/nexus/billing/renewals", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-root",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(renewalBody),
    });
    expect(dup.status).toBe(409);
  });

  it("rejects payment without renewal or adjustment", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/nexus/billing/payments", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-billing",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        amount_inr: 500,
        method: "offline",
      }),
    });
    expect(res.status).toBe(400);
  });
});
