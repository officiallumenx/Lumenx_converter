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
const USER_ADMIN = "44444444-4444-4444-8444-444444444444";
const USER_NEW = "55555555-5555-4555-8555-555555555555";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_ADMIN = "aa444444-4444-4444-8444-444444444444";
const OP_ROOT = "c0111111-1111-4111-8111-111111111111";
const OP_BILLING = "c0222222-2222-4222-8222-222222222222";
const OP_SUPPORT = "c0333333-3333-4333-8333-333333333333";

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
      id: USER_ADMIN,
      display_name: "Admin",
      email: "a@x.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_NEW,
      display_name: "New Op",
      email: "n@x.com",
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
        "token-admin": USER_ADMIN,
      },
      db,
    }),
  );
}

describe("nexus core api", () => {
  it("rejects institute admin from operators list", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/nexus/operators", {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(res.status).toBe(403);
  });

  it("lists operators for any platform operator", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/nexus/operators", {
      headers: { Authorization: "Bearer token-support" },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toHaveLength(3);
  });

  it("allows only nexus_root to create operators", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const denied = await app.request("/api/nexus/operators", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-billing",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: USER_NEW,
        roleCode: "analyst",
        handle: "analyst1",
        displayName: "Analyst One",
      }),
    });
    expect(denied.status).toBe(403);

    const ok = await app.request("/api/nexus/operators", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-root",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: USER_NEW,
        roleCode: "analyst",
        handle: "analyst1",
        displayName: "Analyst One",
      }),
    });
    expect(ok.status).toBe(201);
    const body = await json(ok);
    expect(body.data.roleCode).toBe("analyst");
    expect(body.data.handle).toBe("analyst1");
  });

  it("prevents root from deleting self", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/nexus/operators/${OP_ROOT}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer token-root" },
    });
    expect(res.status).toBe(403);
  });

  it("upserts license with entitlements for billing role", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const denied = await app.request("/api/nexus/licenses", {
      method: "PUT",
      headers: {
        Authorization: "Bearer token-support",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instituteId: INST_A,
        plan: "plus",
        cadence: "yearly",
      }),
    });
    expect(denied.status).toBe(403);

    const res = await app.request("/api/nexus/licenses", {
      method: "PUT",
      headers: {
        Authorization: "Bearer token-billing",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instituteId: INST_A,
        plan: "plus",
        cadence: "yearly",
        entitlements: [
          {
            scope: "admin_module",
            targetId: "fees",
            enabled: true,
          },
          {
            scope: "connect_module",
            portalId: "teachers",
            targetId: "homework",
            enabled: true,
          },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.plan).toBe("plus");
    expect(body.data.entitlements).toHaveLength(2);

    const list = await app.request(
      `/api/nexus/licenses?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-support" } },
    );
    expect(list.status).toBe(200);
    const listed = await json(list);
    expect(listed.data).toHaveLength(1);
  });

  it("upserts subscription and creates current period", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const subRes = await app.request("/api/nexus/subscriptions", {
      method: "PUT",
      headers: {
        Authorization: "Bearer token-billing",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instituteId: INST_A,
        lifecycleStatus: "trial_active",
        assignedRateInr: 49,
        activeStudentCount: 100,
        trialStartAt: "2026-01-01T00:00:00.000Z",
        trialEndAt: "2026-01-15T00:00:00.000Z",
      }),
    });
    expect(subRes.status).toBe(200);
    const sub = (await json(subRes)).data;
    expect(sub.lifecycleStatus).toBe("trial_active");
    expect(sub.assignedRateInr).toBe(49);

    const periodRes = await app.request(
      `/api/nexus/subscriptions/${sub.id}/periods`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-root",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          durationMonths: 12,
          activeStudentCount: 100,
          assignedRateInr: 49,
          monthlyPriceInr: 4900,
          regularAmountInr: 58800,
          payableAmountInr: 58800,
          startsAt: "2026-02-01T00:00:00.000Z",
          endsAt: "2027-02-01T00:00:00.000Z",
          paymentMethod: "offline",
          paymentStatus: "none",
        }),
      },
    );
    expect(periodRes.status).toBe(201);
    const period = (await json(periodRes)).data;
    expect(period.isCurrent).toBe(true);

    const getRes = await app.request(`/api/nexus/subscriptions/${sub.id}`, {
      headers: { Authorization: "Bearer token-support" },
    });
    expect(getRes.status).toBe(200);
    const got = (await json(getRes)).data;
    expect(got.currentPeriodId).toBe(period.id);
    expect(got.currentPeriod?.id).toBe(period.id);
  });

  it("keeps health public without auth", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/nexus/health");
    expect(res.status).toBe(200);
  });

  it("returns network analytics for platform operators", async () => {
    const db = baseDb();
    db.student = [
      {
        id: "ac111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        display_name: "Kid",
        deleted_at: null,
        created_at: "2026-06-01T00:00:00.000Z",
      },
    ];
    db.support_thread = [
      {
        id: "st111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        subject: "Help",
        category: "issue",
        status: "open",
        priority: "medium",
        assignee_handle: null,
        assignee_user_id: null,
        created_by_user_id: USER_ADMIN,
        last_message_at: "2026-08-01T00:00:00.000Z",
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    const app = appWithDb(db);

    const denied = await app.request("/api/nexus/analytics/network", {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(denied.status).toBe(403);

    const res = await app.request(
      "/api/nexus/analytics/network?range=6m",
      { headers: { Authorization: "Bearer token-root" } },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.kpis.institutes).toBeGreaterThanOrEqual(1);
    expect(body.data.kpis.students).toBe(1);
    expect(body.data.kpis.supportOpen).toBe(1);
    expect(body.data.series.labels.length).toBe(6);
    expect(body.data.planMix).toBeTruthy();
  });
});
