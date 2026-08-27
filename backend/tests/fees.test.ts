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

const USER_ADMIN = "11111111-1111-4111-8111-111111111111";
const USER_TEACHER = "22222222-2222-4222-8222-222222222222";
const USER_PARENT = "55555555-5555-4555-8555-555555555555";
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const YEAR_A = "cc111111-1111-4111-8111-111111111111";
const CLASS_A = "cd111111-1111-4111-8111-111111111111";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const PARENT_A = "ba111111-1111-4111-8111-111111111111";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_PARENT = "aa555555-5555-4555-8555-555555555555";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const PLAN_A = "ee111111-1111-4111-8111-111111111111";
const COMP_A = "ef111111-1111-4111-8111-111111111111";

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
    { id: USER_ADMIN, display_name: "Admin", email: "a@x.com", status: "active", deleted_at: null },
    { id: USER_TEACHER, display_name: "Teacher", email: "t@x.com", status: "active", deleted_at: null },
    { id: USER_PARENT, display_name: "Parent", email: "p@x.com", status: "active", deleted_at: null },
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_PARENT, user_id: USER_PARENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
  ];
  db.institute = [
    { id: INST_A, code: "A", name: "A", kind: "school", status: "active", deleted_at: null },
    { id: INST_B, code: "B", name: "B", kind: "school", status: "active", deleted_at: null },
  ];
  db.academic_year = [
    { id: YEAR_A, institute_id: INST_A, label: "2026-27", status: "active", deleted_at: null },
  ];
  db.class = [
    { id: CLASS_A, institute_id: INST_A, academic_year_id: YEAR_A, name: "10", deleted_at: null },
  ];
  db.enrollment = [
    {
      id: "en111111-1111-4111-8111-111111111111",
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      student_id: STUDENT_A,
      class_id: CLASS_A,
      section_id: "se111111-1111-4111-8111-111111111111",
      status: "active",
      deleted_at: null,
    },
  ];
  db.student = [
    {
      id: STUDENT_A,
      institute_id: INST_A,
      display_name: "Kid",
      first_name: "Kid",
      surname: "A",
      deleted_at: null,
    },
  ];
  db.parent = [
    { id: PARENT_A, institute_id: INST_A, user_profile_id: USER_PARENT, deleted_at: null },
  ];
  db.guardian_link = [
    {
      parent_id: PARENT_A,
      student_id: STUDENT_A,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.fee_plan = [
    {
      id: PLAN_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      status: "draft",
      publish_scope: "institute",
      published_class_ids: [],
      published_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.fee_component = [
    {
      id: COMP_A,
      institute_id: INST_A,
      fee_plan_id: PLAN_A,
      kind: "tuition",
      name: "Tuition",
      active: true,
      assigned_to_all: true,
      assigned_class_ids: [],
      class_amounts: { [CLASS_A]: 10000 },
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
        "token-admin": USER_ADMIN,
        "token-teacher": USER_TEACHER,
        "token-parent": USER_PARENT,
        "token-other": USER_OTHER,
      },
      db,
    }),
  );
}

describe("fees api", () => {
  it("lists plans for staff and blocks cross-tenant", async () => {
    const app = appWithDb(baseDb());
    const ok = await app.request(`/api/v1/fees/plans?institute_id=${INST_A}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(ok.status).toBe(200);
    expect((await json(ok)).data).toHaveLength(1);

    const cross = await app.request(`/api/v1/fees/plans?institute_id=${INST_B}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(cross.status).toBe(403);
  });

  it("publishes plan, resolves parent account, records payment", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const parentDraft = await app.request(
      `/api/v1/fees/accounts/${STUDENT_A}?plan_id=${PLAN_A}&class_id=${CLASS_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(parentDraft.status).toBe(403);

    const published = await app.request(`/api/v1/fees/plans/${PLAN_A}/publish`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publish_scope: "institute" }),
    });
    expect(published.status).toBe(200);
    expect((await json(published)).data.status).toBe("published");

    const account = await app.request(
      `/api/v1/fees/accounts/${STUDENT_A}?plan_id=${PLAN_A}&class_id=${CLASS_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(account.status).toBe(200);
    const acct = (await json(account)).data;
    expect(acct.billedAmount).toBe(10000);
    expect(acct.lines).toHaveLength(1);

    const pay = await app.request("/api/v1/fees/payments", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fee_plan_id: PLAN_A,
        student_id: STUDENT_A,
        class_id: CLASS_A,
        amount: 4000,
        method: "cash",
        paid_on: "2026-08-01",
      }),
    });
    expect(pay.status).toBe(201);
    const payment = (await json(pay)).data;
    expect(payment.amount).toBe(4000);
    expect(payment.receiptNo).toMatch(/^RCP-/);

    const after = await app.request(
      `/api/v1/fees/accounts/${STUDENT_A}?plan_id=${PLAN_A}&class_id=${CLASS_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    const afterAcct = (await json(after)).data;
    expect(afterAcct.paidAmount).toBe(4000);
    expect(afterAcct.dueAmount).toBe(6000);
    expect(afterAcct.status).toBe("partial");
  });

  it("blocks teacher from recording payments", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/fees/payments", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fee_plan_id: PLAN_A,
        student_id: STUDENT_A,
        class_id: CLASS_A,
        amount: 100,
        method: "cash",
        paid_on: "2026-08-01",
      }),
    });
    expect(res.status).toBe(403);
  });

  it("upserts concession for staff", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/fees/concessions", {
      method: "PUT",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fee_plan_id: PLAN_A,
        student_id: STUDENT_A,
        fee_component_id: COMP_A,
        amount: 8000,
        note: "Sibling discount",
      }),
    });
    expect(res.status).toBe(200);
    expect((await json(res)).data.amount).toBe(8000);
  });
});
