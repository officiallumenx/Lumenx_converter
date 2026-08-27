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
const USER_OPS = "77777777-7777-4777-8777-777777777777";
const USER_SUPPORT = "33333333-3333-4333-8333-333333333333";
const USER_BILLING = "22222222-2222-4222-8222-222222222222";
const USER_ANALYST = "66666666-6666-4666-8666-666666666666";
const USER_ADMIN = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_ADMIN = "aa444444-4444-4444-8444-444444444444";
const OP_ROOT = "c0111111-1111-4111-8111-111111111111";
const OP_OPS = "c0777777-7777-4777-8777-777777777777";
const OP_SUPPORT = "c0333333-3333-4333-8333-333333333333";
const OP_BILLING = "c0222222-2222-4222-8222-222222222222";
const OP_ANALYST = "c0666666-6666-4666-8666-666666666666";
const MISSING_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const RULE_PAY = "d0111111-1111-4111-8111-111111111111";
const QUOTA_CORE = "e0111111-1111-4111-8111-111111111111";

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
      id: USER_OPS,
      display_name: "Ops",
      email: "ops@x.com",
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
      id: USER_BILLING,
      display_name: "Billing",
      email: "bill@x.com",
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
      id: OP_OPS,
      user_id: USER_OPS,
      role_code: "operations",
      handle: "ops",
      display_name: "Ops",
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
  db.policy_rule = [
    {
      id: RULE_PAY,
      kind: "payment_overdue",
      name: "Payment overdue",
      description: "Fires when payment is overdue.",
      condition_text: "institute.paymentStatus = overdue",
      severity_default: "high",
      enabled: true,
      updated_by_user_id: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.storage_quota = [
    {
      id: QUOTA_CORE,
      plan: "core",
      limit_gb: 50,
      warning_pct: 80,
      updated_by_user_id: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: "e0222222-2222-4222-8222-222222222222",
      plan: "plus",
      limit_gb: 200,
      warning_pct: 80,
      updated_by_user_id: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: "e0333333-3333-4333-8333-333333333333",
      plan: "max",
      limit_gb: 500,
      warning_pct: 80,
      updated_by_user_id: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
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
        "token-ops": USER_OPS,
        "token-support": USER_SUPPORT,
        "token-billing": USER_BILLING,
        "token-analyst": USER_ANALYST,
        "token-admin": USER_ADMIN,
      },
      db,
    }),
  );
}

describe("nexus policies api", () => {
  it("rejects institute admin from listing rules", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/nexus/policies/rules", {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(res.status).toBe(403);
  });

  it("allows all platform roles to list rules and quotas", async () => {
    const app = appWithDb(baseDb());
    for (const token of [
      "token-root",
      "token-ops",
      "token-support",
      "token-billing",
      "token-analyst",
    ] as const) {
      const rules = await app.request("/api/nexus/policies/rules", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(rules.status).toBe(200);
      expect((await json(rules)).data.length).toBeGreaterThanOrEqual(1);

      const quotas = await app.request("/api/nexus/policies/storage-quotas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(quotas.status).toBe(200);
      expect((await json(quotas)).data).toHaveLength(3);
    }
  });

  it("ops can toggle rule enabled; support cannot", async () => {
    const app = appWithDb(baseDb());

    const denied = await app.request(`/api/nexus/policies/rules/${RULE_PAY}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-support",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled: false }),
    });
    expect(denied.status).toBe(403);

    const patched = await app.request(`/api/nexus/policies/rules/${RULE_PAY}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-ops",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled: false }),
    });
    expect(patched.status).toBe(200);
    expect((await json(patched)).data.enabled).toBe(false);
  });

  it("root upserts storage quota limits", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/nexus/policies/storage-quotas", {
      method: "PUT",
      headers: {
        Authorization: "Bearer token-root",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan: "core", limit_gb: 75, warning_pct: 85 }),
    });
    expect(res.status).toBe(200);
    const data = (await json(res)).data;
    expect(data.plan).toBe("core");
    expect(data.limitGb).toBe(75);
    expect(data.warningPct).toBe(85);
  });

  it("rejects billing and analyst from mutating quotas", async () => {
    const app = appWithDb(baseDb());
    for (const token of ["token-billing", "token-analyst"] as const) {
      const res = await app.request("/api/nexus/policies/storage-quotas", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: "plus", limit_gb: 250 }),
      });
      expect(res.status).toBe(403);
    }
  });

  it("creates rule and rejects duplicate kind with 409", async () => {
    const app = appWithDb(baseDb());

    const created = await app.request("/api/nexus/policies/rules", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-ops",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind: "platform_incident",
        name: "Platform incident",
        severity_default: "critical",
      }),
    });
    expect(created.status).toBe(201);

    const dup = await app.request("/api/nexus/policies/rules", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-root",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind: "payment_overdue",
        name: "Dup",
      }),
    });
    expect(dup.status).toBe(409);
  });

  it("soft-deletes rule and returns 404 after", async () => {
    const app = appWithDb(baseDb());
    const del = await app.request(`/api/nexus/policies/rules/${RULE_PAY}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer token-root" },
    });
    expect(del.status).toBe(200);

    const get = await app.request(`/api/nexus/policies/rules/${RULE_PAY}`, {
      headers: { Authorization: "Bearer token-ops" },
    });
    expect(get.status).toBe(404);
  });

  it("returns 404 for missing rule", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/nexus/policies/rules/${MISSING_ID}`, {
      headers: { Authorization: "Bearer token-ops" },
    });
    expect(res.status).toBe(404);
  });
});
