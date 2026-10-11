import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";
import { auditSubscriptionCoverage } from "../src/domains/subscriptions/coverage-audit.js";

const silentLogger = createLogger("error");

const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SUB_A = "s0111111-1111-4111-8111-111111111111";
const USER_BILLING = "22222222-2222-4222-8222-222222222222";
const USER_ADMIN = "44444444-4444-4444-8444-444444444444";
const OP_BILLING = "c0222222-2222-4222-8222-222222222222";
const MEMBER_ADMIN = "aa444444-4444-4444-8444-444444444444";

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
      name: "Beta (no sub)",
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
      id: USER_ADMIN,
      display_name: "Admin",
      email: "admin@lx.test",
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
  // Stale trial_active past grace → stale_lifecycle / expired_dates
  db.subscription = [
    {
      id: SUB_A,
      institute_id: INST_A,
      lifecycle_status: "trial_active",
      assigned_rate_inr: 12,
      active_student_count: 99,
      trial_start_at: "2026-01-01T00:00:00.000Z",
      trial_end_at: "2026-03-01T00:00:00.000Z",
      grace_ends_at: "2026-03-08T00:00:00.000Z",
      current_period_id: null,
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];
  return db;
}

describe("subscription coverage audit", () => {
  it("reports missing subscription and stale lifecycle without mutating rows", async () => {
    const db = baseDb();
    const clients = createMockSupabaseClients({ db, tokens: {} });
    const before = structuredClone(db.subscription);

    const report = await auditSubscriptionCoverage(clients.admin, {
      now: new Date("2026-09-03T00:00:00.000Z"),
    });

    expect(report.scannedInstitutes).toBe(2);
    expect(report.scannedSubscriptions).toBe(1);
    expect(report.issueCount).toBeGreaterThanOrEqual(2);

    const categories = report.issues.map((i) => i.category);
    expect(categories).toContain("missing_subscription");
    expect(categories).toContain("stale_lifecycle_status");

    const missing = report.issues.find((i) => i.category === "missing_subscription");
    expect(missing?.instituteId).toBe(INST_B);
    expect(missing?.recommendedAction).toMatch(/Do not auto-backfill/i);

    // Read-only: commercial rows unchanged (no create/update/activate)
    expect(db.subscription).toEqual(before);
    expect(db.renewal_record ?? []).toEqual([]);
    expect(db.payment ?? []).toEqual([]);
    expect(db.subscription_period ?? []).toEqual([]);
  });

  it("GET /api/nexus/subscriptions/coverage-audit is platform-operator only", async () => {
    const db = baseDb();
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({
        db,
        tokens: {
          "token-billing": USER_BILLING,
          "token-admin": USER_ADMIN,
        },
      }),
    );

    const denied = await app.request("/api/nexus/subscriptions/coverage-audit", {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(denied.status).toBe(403);

    const ok = await app.request("/api/nexus/subscriptions/coverage-audit", {
      headers: { Authorization: "Bearer token-billing" },
    });
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as any;
    expect(body.data.issueCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.data.issues)).toBe(true);
    // No PII beyond institute id/code/name
    for (const issue of body.data.issues) {
      expect(issue).toHaveProperty("instituteId");
      expect(issue).toHaveProperty("category");
      expect(issue).toHaveProperty("recommendedAction");
      expect(issue).not.toHaveProperty("email");
      expect(issue).not.toHaveProperty("phone");
    }
  });
});
