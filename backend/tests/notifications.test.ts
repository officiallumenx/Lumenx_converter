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
const USER_STUDENT = "33333333-3333-4333-8333-333333333333";
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_STUDENT = "aa333333-3333-4333-8333-333333333333";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const TEMPLATE_PUB = "dd111111-1111-4111-8111-111111111111";
const TEMPLATE_DRAFT = "dd222222-2222-4222-8222-222222222222";

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
    { id: USER_STUDENT, display_name: "Student", email: "s@x.com", status: "active", deleted_at: null },
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_STUDENT, user_id: USER_STUDENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_STUDENT, role_code: "student" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
  ];
  db.institute = [
    { id: INST_A, code: "A", name: "A", kind: "school", status: "active", deleted_at: null },
    { id: INST_B, code: "B", name: "B", kind: "school", status: "active", deleted_at: null },
  ];
  db.notification_template = [
    {
      id: TEMPLATE_PUB,
      institute_id: INST_A,
      template_key: "system.test.published",
      category: "system",
      audience: "student",
      title: "Hello {{name}}",
      body: "Body",
      priority: "normal",
      deep_link: null,
      status: "published",
      version: "1.0.0",
      allowed_variables: ["name"],
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: TEMPLATE_DRAFT,
      institute_id: INST_A,
      template_key: "system.test.draft",
      category: "system",
      audience: "student",
      title: "Secret draft",
      body: "Draft body",
      priority: "normal",
      deep_link: null,
      status: "draft",
      version: "1.0.0",
      allowed_variables: [],
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
        "token-student": USER_STUDENT,
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

describe("notifications — emit and inbox privacy", () => {
  it("staff emits; recipients see own; peers cannot read", async () => {
    const app = appWithDb(baseDb());

    expect(
      (
        await app.request("/api/v1/notifications", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({
            institute_id: INST_A,
            category: "system",
            title: "Nope",
            body: "Nope",
            recipient_user_ids: [USER_STUDENT],
          }),
        })
      ).status,
    ).toBe(403);

    const emitted = await app.request("/api/v1/notifications", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        category: "system",
        title: "Fee due",
        body: "Please pay",
        recipient_user_ids: [USER_STUDENT, USER_TEACHER],
      }),
    });
    expect(emitted.status).toBe(201);
    const emittedBody = await json(emitted);
    expect(emittedBody.data).toHaveLength(2);
    const teacherRecipientId = (
      emittedBody.data as Array<{ id: string; userProfileId: string }>
    ).find((r) => r.userProfileId === USER_TEACHER)!.id;

    const studentInbox = await app.request(
      `/api/v1/notifications?institute_id=${INST_A}`,
      { headers: auth("token-student") },
    );
    expect(studentInbox.status).toBe(200);
    const studentItems = (await json(studentInbox)).data as Array<{
      id: string;
      userProfileId: string;
      notification: { title: string };
    }>;
    expect(studentItems).toHaveLength(1);
    expect(studentItems[0].userProfileId).toBe(USER_STUDENT);
    expect(studentItems[0].notification.title).toBe("Fee due");

    expect(
      (await app.request(`/api/v1/notifications/${teacherRecipientId}`, {
        headers: auth("token-student"),
      })).status,
    ).toBe(403);

    const marked = await app.request(`/api/v1/notifications/${studentItems[0].id}`, {
      method: "PATCH",
      headers: jsonHeaders("token-student"),
      body: JSON.stringify({ read: true, starred: true }),
    });
    expect(marked.status).toBe(200);
    const markedBody = await json(marked);
    expect(markedBody.data.readAt).toBeTruthy();
    expect(markedBody.data.starredAt).toBeTruthy();
  });
});

describe("notifications — tenant isolation", () => {
  it("blocks cross-institute emit and inbox", async () => {
    const app = appWithDb(baseDb());
    expect(
      (
        await app.request("/api/v1/notifications", {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({
            institute_id: INST_B,
            category: "system",
            title: "X",
            body: "Y",
            recipient_user_ids: [USER_OTHER],
          }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request(`/api/v1/notifications?institute_id=${INST_B}`, {
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request("/api/v1/notifications", {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({
            institute_id: INST_A,
            category: "system",
            title: "X",
            body: "Y",
            recipient_user_ids: [USER_OTHER],
          }),
        })
      ).status,
    ).toBe(201);
  });
});

describe("notifications — templates and device tokens", () => {
  it("hides drafts from learners; registers own device tokens", async () => {
    const app = appWithDb(baseDb());

    const studentTemplates = await app.request(
      `/api/v1/notifications/templates?institute_id=${INST_A}`,
      { headers: auth("token-student") },
    );
    expect(studentTemplates.status).toBe(200);
    const studentIds = ((await json(studentTemplates)).data as Array<{ id: string }>).map(
      (r) => r.id,
    );
    expect(studentIds).toContain(TEMPLATE_PUB);
    expect(studentIds).not.toContain(TEMPLATE_DRAFT);

    const adminTemplates = await app.request(
      `/api/v1/notifications/templates?institute_id=${INST_A}`,
      { headers: auth("token-admin") },
    );
    expect(adminTemplates.status).toBe(200);
    const adminIds = ((await json(adminTemplates)).data as Array<{ id: string }>).map(
      (r) => r.id,
    );
    expect(adminIds).toContain(TEMPLATE_DRAFT);

    const registered = await app.request("/api/v1/notifications/device-tokens", {
      method: "POST",
      headers: jsonHeaders("token-student"),
      body: JSON.stringify({
        app: "connect",
        platform: "android",
        token: "fcm-token-student-1",
      }),
    });
    expect(registered.status).toBe(201);
    const tokenId = (await json(registered)).data.id as string;

    const list = await app.request("/api/v1/notifications/device-tokens", {
      headers: auth("token-student"),
    });
    expect(list.status).toBe(200);
    expect(((await json(list)).data as unknown[]).length).toBe(1);

    expect(
      (
        await app.request(`/api/v1/notifications/device-tokens/${tokenId}`, {
          method: "DELETE",
          headers: auth("token-teacher"),
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await app.request(`/api/v1/notifications/device-tokens/${tokenId}`, {
          method: "DELETE",
          headers: auth("token-student"),
        })
      ).status,
    ).toBe(200);
  });
});

describe("notifications — auth and validation", () => {
  it("requires JWT and rejects legacy ids", async () => {
    const app = appWithDb(baseDb());
    expect((await app.request(`/api/v1/notifications?institute_id=${INST_A}`)).status).toBe(
      401,
    );
    expect(
      (await app.request("/api/v1/notifications/NOTIF-1", { headers: auth("token-admin") }))
        .status,
    ).toBe(400);
  });
});

describe("notifications — external recipient inbox", () => {
  const USER_APPLICANT = "66666666-6666-4666-8666-666666666666";

  it("lists and marks read without institute membership when user has recipients", async () => {
    const db = baseDb();
    db.user_profile.push({
      id: USER_APPLICANT,
      display_name: "Applicant",
      email: "applicant@x.com",
      status: "active",
      deleted_at: null,
    });
    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      silentLogger,
      createMockSupabaseClients({
        tokens: {
          "token-admin": USER_ADMIN,
          "token-applicant": USER_APPLICANT,
        },
        db,
      }),
    );

    const emitted = await app.request("/api/v1/notifications", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        category: "admissions",
        title: "Application update",
        body: "Your application moved to review.",
        recipient_user_ids: [USER_APPLICANT],
      }),
    });
    expect(emitted.status).toBe(201);

    const scoped = await app.request(
      `/api/v1/notifications?institute_id=${INST_A}`,
      { headers: auth("token-applicant") },
    );
    expect(scoped.status).toBe(200);
    expect((await json(scoped)).data).toHaveLength(1);

    const all = await app.request("/api/v1/notifications", {
      headers: auth("token-applicant"),
    });
    expect(all.status).toBe(200);
    const allPayload = await json(all);
    expect(allPayload.data).toHaveLength(1);

    const recipientId = allPayload.data[0].id as string;
    const marked = await app.request(`/api/v1/notifications/${recipientId}`, {
      method: "PATCH",
      headers: jsonHeaders("token-applicant"),
      body: JSON.stringify({ read: true }),
    });
    expect(marked.status).toBe(200);
    expect((await json(marked)).data.readAt).toBeTruthy();
  });
});

describe("notifications — role audience broadcast", () => {
  it("emits to students only within institute; excludes other institute", async () => {
    const app = appWithDb(baseDb());

    const emitted = await app.request("/api/v1/notifications", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        category: "announcements",
        title: "Students only",
        body: "Role audience",
        audience: "students",
      }),
    });
    expect(emitted.status).toBe(201);
    const data = (await json(emitted)).data as Array<{
      userProfileId: string;
      instituteId: string;
    }>;
    expect(data).toHaveLength(1);
    expect(data[0].userProfileId).toBe(USER_STUDENT);
    expect(data[0].instituteId).toBe(INST_A);

    const everyone = await app.request("/api/v1/notifications", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        category: "announcements",
        title: "All members",
        body: "Everyone",
        audience: "everyone",
      }),
    });
    expect(everyone.status).toBe(201);
    const allRecipients = (await json(everyone)).data as Array<{
      userProfileId: string;
    }>;
    const ids = allRecipients.map((r) => r.userProfileId).sort();
    expect(ids).toEqual([USER_ADMIN, USER_STUDENT, USER_TEACHER].sort());
    expect(ids).not.toContain(USER_OTHER);
  });

  it("rejects both audience and recipient_user_ids; rejects unauthorized emit", async () => {
    const app = appWithDb(baseDb());
    expect(
      (
        await app.request("/api/v1/notifications", {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({
            institute_id: INST_A,
            category: "system",
            title: "X",
            body: "Y",
            audience: "teachers",
            recipient_user_ids: [USER_TEACHER],
          }),
        })
      ).status,
    ).toBe(400);

    expect(
      (
        await app.request("/api/v1/notifications", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({
            institute_id: INST_A,
            category: "system",
            title: "X",
            body: "Y",
            audience: "students",
          }),
        })
      ).status,
    ).toBe(403);
  });

  it("rejects invalid UUID recipients", async () => {
    const app = appWithDb(baseDb());
    expect(
      (
        await app.request("/api/v1/notifications", {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({
            institute_id: INST_A,
            category: "system",
            title: "X",
            body: "Y",
            recipient_user_ids: ["not-a-uuid"],
          }),
        })
      ).status,
    ).toBe(400);
  });
});
