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
const USER_PARENT = "22222222-2222-4222-8222-222222222222";
const USER_STUDENT = "33333333-3333-4333-8333-333333333333";
const USER_TEACHER = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_PARENT = "aa222222-2222-4222-8222-222222222222";
const MEMBER_STUDENT = "aa333333-3333-4333-8333-333333333333";
const MEMBER_TEACHER = "aa444444-4444-4444-8444-444444444444";

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
    { id: USER_PARENT, display_name: "Parent", email: "p@x.com", status: "active", deleted_at: null },
    { id: USER_STUDENT, display_name: "Student", email: "s@x.com", status: "active", deleted_at: null },
    { id: USER_TEACHER, display_name: "Teacher", email: "t@x.com", status: "active", deleted_at: null },
  ];
  db.institute = [
    { id: INST_A, code: "A", name: "Alpha", kind: "school", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_PARENT, user_id: USER_PARENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_STUDENT, user_id: USER_STUDENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
    { membership_id: MEMBER_STUDENT, role_code: "student" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
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
        "token-parent": USER_PARENT,
        "token-student": USER_STUDENT,
        "token-teacher": USER_TEACHER,
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

describe("school-alerts — broadcast & inbox", () => {
  it("admin broadcasts holiday alert to parents and students", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const res = await app.request("/api/v1/school-alerts/broadcast", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        title: "Holiday — Diwali break",
        summary: "School closed 20–24 Oct",
        detail: "Campus closed for the festival break.",
        severity: "mandatory",
        category: "holiday",
        source_label: "Holidays",
        audience: "parents_and_students",
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.alertId).toBeTruthy();
    expect(body.data.recipientCount).toBe(2);
    expect(db.school_alert).toHaveLength(1);
    expect(db.school_alert[0]?.category).toBe("holiday");
    expect(db.school_alert_recipient.length).toBe(2);
    expect(db.notification.length).toBeGreaterThan(0);
    const payload = db.notification[0]?.payload as Record<string, unknown>;
    expect(payload?.presentation).toBe("alert");
  });

  it("lists recent broadcasts for institute admin", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    await app.request("/api/v1/school-alerts/broadcast", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        title: "Emergency closure",
        severity: "emergency",
        category: "closure",
        audience: "parents_and_students",
      }),
    });

    const listed = await app.request(
      `/api/v1/school-alerts/recent?institute_id=${INST_A}`,
      { headers: auth("token-admin") },
    );
    expect(listed.status).toBe(200);
    const rows = (await json(listed)).data;
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Emergency closure");
    expect(rows[0].severity).toBe("emergency");
    expect(rows[0].recipientCount).toBe(2);
  });

  it("parent sees broadcast in portal inbox and can acknowledge", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    await app.request("/api/v1/school-alerts/broadcast", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        title: "Weather advisory",
        category: "weather",
        audience: "parents",
      }),
    });

    const inbox = await app.request(
      `/api/v1/school-alerts/portal/inbox?institute_id=${INST_A}`,
      { headers: auth("token-parent") },
    );
    expect(inbox.status).toBe(200);
    const items = (await json(inbox)).data;
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Weather advisory");
    expect(items[0].acknowledged).toBe(false);

    const recipientId = items[0].id as string;
    const ack = await app.request(
      `/api/v1/school-alerts/portal/inbox/${recipientId}/acknowledge`,
      { method: "PATCH", headers: auth("token-parent") },
    );
    expect(ack.status).toBe(200);
    expect((await json(ack)).data.acknowledged).toBe(true);
  });

  it("teacher cannot broadcast school alerts", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const res = await app.request("/api/v1/school-alerts/broadcast", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({
        institute_id: INST_A,
        title: "Should fail",
        audience: "parents",
      }),
    });
    expect(res.status).toBe(403);
  });
});
