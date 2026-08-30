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
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";

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
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
  ];
  db.institute = [
    { id: INST_A, code: "A", name: "A", kind: "school", status: "active", deleted_at: null },
    { id: INST_B, code: "B", name: "B", kind: "school", status: "active", deleted_at: null },
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
        "token-other": USER_OTHER,
      },
      db,
    }),
  );
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const jsonHeaders = (token: string) => ({
  ...auth(token),
  "Content-Type": "application/json",
});

describe("alert-rules — durable CRUD", () => {
  it("creates, lists, updates, deletes; persists on shared db (restart stand-in)", async () => {
    const db = baseDb();
    const app1 = appWithDb(db);

    expect(
      (
        await json(
          await app1.request(`/api/v1/alert-rules?institute_id=${INST_A}`, {
            headers: auth("token-admin"),
          }),
        )
      ).data,
    ).toHaveLength(0);

    const created = await app1.request("/api/v1/alert-rules", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Attendance drop",
        icon_key: "attendance",
        priority: "P2",
        config: { threshold_pct: 75 },
      }),
    });
    expect(created.status).toBe(201);
    const rule = (await json(created)).data;
    expect(rule.instituteId).toBe(INST_A);
    expect(rule.config?.thresholdPct).toBe(75);
    expect(db.alert_rule).toHaveLength(1);

    // New app instance over same db ≈ process restart with durable storage
    const app2 = appWithDb(db);
    const listed = await app2.request(
      `/api/v1/alert-rules?institute_id=${INST_A}`,
      { headers: auth("token-admin") },
    );
    expect(listed.status).toBe(200);
    const rules = (await json(listed)).data as Array<{ id: string; name: string }>;
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe(rule.id);
    expect(rules[0].name).toBe("Attendance drop");

    const patched = await app2.request(`/api/v1/alert-rules/${rule.id}`, {
      method: "PATCH",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ active: false, name: "Attendance drop (off)" }),
    });
    expect(patched.status).toBe(200);
    const patchedBody = await json(patched);
    expect(patchedBody.data.active).toBe(false);
    expect(patchedBody.data.name).toBe("Attendance drop (off)");

    const deleted = await app2.request(`/api/v1/alert-rules/${rule.id}`, {
      method: "DELETE",
      headers: auth("token-admin"),
    });
    expect(deleted.status).toBe(200);

    const afterDelete = await app2.request(
      `/api/v1/alert-rules?institute_id=${INST_A}`,
      { headers: auth("token-admin") },
    );
    expect((await json(afterDelete)).data).toHaveLength(0);
    expect(db.alert_rule[0].deleted_at).toBeTruthy();
  });
});

describe("alert-rules — isolation and auth", () => {
  it("isolates institutes and blocks unauthorized / invalid ids", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const created = await app.request("/api/v1/alert-rules", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "A only",
        icon_key: "complaint",
      }),
    });
    expect(created.status).toBe(201);
    const ruleId = (await json(created)).data.id as string;

    expect(
      (
        await app.request(`/api/v1/alert-rules?institute_id=${INST_B}`, {
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await app.request(`/api/v1/alert-rules?institute_id=${INST_A}`, {
          headers: auth("token-other"),
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await app.request("/api/v1/alert-rules", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({
            institute_id: INST_A,
            name: "Nope",
          }),
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await app.request(`/api/v1/alert-rules/${ruleId}`, {
          method: "PATCH",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({ active: false }),
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await app.request(`/api/v1/alert-rules/not-a-uuid`, {
          method: "PATCH",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({ active: false }),
        })
      ).status,
    ).toBe(400);

    expect(
      (
        await app.request(
          `/api/v1/alert-rules/99999999-9999-4999-8999-999999999999`,
          {
            method: "DELETE",
            headers: auth("token-admin"),
          },
        )
      ).status,
    ).toBe(404);

    expect(
      (await app.request(`/api/v1/alert-rules?institute_id=${INST_A}`)).status,
    ).toBe(401);
  });

  it("evaluate reads durable active complaint rules", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    await app.request("/api/v1/alert-rules", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Complaint escalation",
        icon_key: "complaint",
        active: true,
      }),
    });

    const evalRes = await app.request(
      `/api/v1/alert-rules/evaluate?institute_id=${INST_A}`,
      { method: "POST", headers: auth("token-admin") },
    );
    expect(evalRes.status).toBe(200);
    expect(Array.isArray((await json(evalRes)).data.fired)).toBe(true);
  });
});
