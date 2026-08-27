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
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_PARENT = "aa555555-5555-4555-8555-555555555555";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const THREAD_OWN = "a0111111-1111-4111-8111-111111111111";
const THREAD_STAFF = "a0222222-2222-4222-8222-222222222222";
const THREAD_CROSS = "a0333333-3333-4333-8333-333333333333";
const THREAD_CLOSED = "a0444444-4444-4444-8444-444444444444";
const MSG_OWN = "a0555555-5555-4555-8555-555555555555";
const MSG_TEACHER = "a0666666-6666-4666-8666-666666666666";
const MSG_CLOSED = "a0777777-7777-4777-8777-777777777777";

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
  db.message_thread = [
    {
      id: THREAD_OWN,
      institute_id: INST_A,
      subject: "Parent ↔ Teacher",
      student_id: null,
      created_by_user_id: USER_PARENT,
      counterpart_user_id: USER_TEACHER,
      status: "open",
      last_message_at: "2026-08-01T00:00:00.000Z",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: THREAD_STAFF,
      institute_id: INST_A,
      subject: "Admin ↔ Teacher only",
      student_id: null,
      created_by_user_id: USER_ADMIN,
      counterpart_user_id: USER_TEACHER,
      status: "open",
      last_message_at: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: THREAD_CLOSED,
      institute_id: INST_A,
      subject: "Closed chat",
      student_id: null,
      created_by_user_id: USER_PARENT,
      counterpart_user_id: USER_TEACHER,
      status: "closed",
      last_message_at: "2026-08-01T00:00:00.000Z",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: THREAD_CROSS,
      institute_id: INST_B,
      subject: "Other institute",
      student_id: null,
      created_by_user_id: USER_OTHER,
      counterpart_user_id: USER_ADMIN,
      status: "open",
      last_message_at: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.message = [
    {
      id: MSG_OWN,
      institute_id: INST_A,
      thread_id: THREAD_OWN,
      sender_user_id: USER_PARENT,
      body: "Hello teacher",
      sent_at: "2026-08-01T00:00:00.000Z",
      read_at: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: MSG_TEACHER,
      institute_id: INST_A,
      thread_id: THREAD_OWN,
      sender_user_id: USER_TEACHER,
      body: "Hello parent",
      sent_at: "2026-08-01T01:00:00.000Z",
      read_at: null,
      created_at: "2026-08-01T01:00:00.000Z",
      updated_at: "2026-08-01T01:00:00.000Z",
      deleted_at: null,
    },
    {
      id: MSG_CLOSED,
      institute_id: INST_A,
      thread_id: THREAD_CLOSED,
      sender_user_id: USER_PARENT,
      body: "Before close",
      sent_at: "2026-08-01T00:00:00.000Z",
      read_at: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
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

describe("messages api", () => {
  it("parent lists only own threads; staff lists all", async () => {
    const app = appWithDb(baseDb());

    const parentList = await app.request(
      `/api/v1/messages/threads?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(parentList.status).toBe(200);
    const parentIds = (await json(parentList)).data.map(
      (t: { id: string }) => t.id,
    );
    expect(parentIds).toContain(THREAD_OWN);
    expect(parentIds).toContain(THREAD_CLOSED);
    expect(parentIds).not.toContain(THREAD_STAFF);

    const staffList = await app.request(
      `/api/v1/messages/threads?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(staffList.status).toBe(200);
    const staffIds = (await json(staffList)).data.map(
      (t: { id: string }) => t.id,
    );
    expect(staffIds).toContain(THREAD_OWN);
    expect(staffIds).toContain(THREAD_STAFF);
    expect(staffIds).toContain(THREAD_CLOSED);
  });

  it("parent GET other person's thread → 404", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request(`/api/v1/messages/threads/${THREAD_STAFF}`, {
      headers: { Authorization: "Bearer token-parent" },
    });
    expect(res.status).toBe(404);
  });

  it("parent can post to own open thread; teacher can reply", async () => {
    const app = appWithDb(baseDb());

    const parentPost = await app.request(
      `/api/v1/messages/threads/${THREAD_OWN}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-parent",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: "Follow-up question" }),
      },
    );
    expect(parentPost.status).toBe(201);

    const teacherPost = await app.request(
      `/api/v1/messages/threads/${THREAD_OWN}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-teacher",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: "Teacher reply" }),
      },
    );
    expect(teacherPost.status).toBe(201);
  });

  it("non-participant post → 404", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request(
      `/api/v1/messages/threads/${THREAD_STAFF}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-parent",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: "probe" }),
      },
    );
    expect(res.status).toBe(404);
  });

  it("cross-tenant get → 404", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request(`/api/v1/messages/threads/${THREAD_CROSS}`, {
      headers: { Authorization: "Bearer token-parent" },
    });
    expect(res.status).toBe(404);
  });

  it("parent cannot create thread to USER_OTHER (other institute) → 400", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/messages/threads", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        counterpart_user_id: USER_OTHER,
        subject: "Nope",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("mark read: recipient ok; sender marking own → 404", async () => {
    const app = appWithDb(baseDb());

    const recipient = await app.request(
      `/api/v1/messages/messages/${MSG_OWN}`,
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token-teacher",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ read: true }),
      },
    );
    expect(recipient.status).toBe(200);
    expect((await json(recipient)).data.readAt).toBeTruthy();

    const sender = await app.request(`/api/v1/messages/messages/${MSG_TEACHER}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ read: true }),
    });
    expect(sender.status).toBe(404);
  });

  it("closed thread: post → 409 for participant", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request(
      `/api/v1/messages/threads/${THREAD_CLOSED}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-parent",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: "too late" }),
      },
    );
    expect(res.status).toBe(409);
  });

  it("participant cannot reopen archived thread (404)", async () => {
    const db = baseDb();
    db.message_thread = db.message_thread.map((t) =>
      t.id === THREAD_CLOSED ? { ...t, status: "archived" } : t,
    );
    const app = appWithDb(db);

    const res = await app.request(`/api/v1/messages/threads/${THREAD_CLOSED}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "open" }),
    });
    expect(res.status).toBe(404);
  });
});
