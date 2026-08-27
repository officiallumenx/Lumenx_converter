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
const USER_PARENT = "55555555-5555-4555-8555-555555555555";
const USER_PARENT_B = "88888888-8888-4888-8888-888888888888";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_STUDENT = "aa333333-3333-4333-8333-333333333333";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const MEMBER_PARENT = "aa555555-5555-4555-8555-555555555555";
const MEMBER_PARENT_B = "aa888888-8888-4888-8888-888888888888";
const PARENT_A = "ba111111-1111-4111-8111-111111111111";
const PARENT_B = "ba222222-2222-4222-8222-222222222222";
const PARENT_OTHER = "ba333333-3333-4333-8333-333333333333";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const STUDENT_B = "ac222222-2222-4222-8222-222222222222";
const STUDENT_OTHER = "ac333333-3333-4333-8333-333333333333";
const LINK_A = "bc111111-1111-4111-8111-111111111111";
const LINK_B = "bc222222-2222-4222-8222-222222222222";

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
    { id: USER_PARENT, display_name: "Parent", email: "p@x.com", status: "active", deleted_at: null },
    { id: USER_PARENT_B, display_name: "ParentB", email: "pb@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_STUDENT, user_id: USER_STUDENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
    { id: MEMBER_PARENT, user_id: USER_PARENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_PARENT_B, user_id: USER_PARENT_B, institute_id: INST_A, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_STUDENT, role_code: "student" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
    { membership_id: MEMBER_PARENT_B, role_code: "parent" },
  ];
  db.student = [
    {
      id: STUDENT_A,
      institute_id: INST_A,
      user_profile_id: USER_STUDENT,
      first_name: "Asha",
      surname: "Patel",
      display_name: "Asha Patel",
      gender: "female",
      address: "x",
      status: "active",
      access_status: "active",
      deleted_at: null,
    },
    {
      id: STUDENT_B,
      institute_id: INST_A,
      user_profile_id: null,
      first_name: "Bala",
      surname: "Khan",
      display_name: "Bala Khan",
      gender: "male",
      address: "x",
      status: "active",
      access_status: "active",
      deleted_at: null,
    },
    {
      id: STUDENT_OTHER,
      institute_id: INST_B,
      user_profile_id: null,
      first_name: "Other",
      surname: "Kid",
      display_name: "Other Kid",
      gender: "other",
      address: "x",
      status: "active",
      access_status: "active",
      deleted_at: null,
    },
  ];
  db.parent = [
    {
      id: PARENT_A,
      institute_id: INST_A,
      user_profile_id: USER_PARENT,
      legacy_code: "PAR-2201",
      name: "Rohan Sharma",
      phone: "9876512345",
      email: "rohan@kin.io",
      address: "14 Lake View",
      invite_status: "active",
      access_status: "active",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: PARENT_B,
      institute_id: INST_A,
      user_profile_id: USER_PARENT_B,
      legacy_code: "PAR-2202",
      name: "Mira Draxler",
      phone: "9876512346",
      email: "mira@kin.io",
      address: "22 Green Park",
      invite_status: "pending",
      access_status: "active",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: PARENT_OTHER,
      institute_id: INST_B,
      user_profile_id: null,
      legacy_code: null,
      name: "Other Parent",
      phone: "1111111111",
      email: null,
      address: null,
      invite_status: "active",
      access_status: "active",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.guardian_link = [
    {
      id: LINK_A,
      institute_id: INST_A,
      student_id: STUDENT_A,
      parent_id: PARENT_A,
      relationship: "father",
      is_primary: true,
      is_emergency_contact: true,
      status: "active",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: LINK_B,
      institute_id: INST_A,
      student_id: STUDENT_B,
      parent_id: PARENT_B,
      relationship: "mother",
      is_primary: true,
      is_emergency_contact: false,
      status: "active",
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
        "token-student": USER_STUDENT,
        "token-other": USER_OTHER,
        "token-parent": USER_PARENT,
        "token-parent-b": USER_PARENT_B,
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

const createBody = {
  institute_id: INST_A,
  name: "New Parent",
  phone: "9000000001",
  email: "new@kin.io",
  address: "Somewhere",
  legacy_code: "PAR-3001",
};

describe("parents — authentication", () => {
  it("returns 401 without/invalid JWT", async () => {
    const app = appWithDb(baseDb());
    expect((await app.request(`/api/v1/parents?institute_id=${INST_A}`)).status).toBe(401);
    expect(
      (await app.request(`/api/v1/parents?institute_id=${INST_A}`, { headers: auth("bad") }))
        .status,
    ).toBe(401);
  });
});

describe("parents — tenant isolation", () => {
  it("blocks cross-institute operations", async () => {
    const app = appWithDb(baseDb());
    expect(
      (await app.request(`/api/v1/parents?institute_id=${INST_B}`, { headers: auth("token-admin") }))
        .status,
    ).toBe(403);
    expect(
      (await app.request(`/api/v1/parents/${PARENT_OTHER}`, { headers: auth("token-admin") })).status,
    ).toBe(403);
    expect(
      (
        await app.request("/api/v1/parents", {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({ ...createBody, institute_id: INST_B }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request(`/api/v1/parents/${PARENT_A}/links`, {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({
            student_id: STUDENT_OTHER,
            relationship: "guardian",
          }),
        })
      ).status,
    ).toBe(400);
  });
});

describe("parents — RBAC and privacy", () => {
  it("staff writes; teacher reads; parent/student privacy scoped", async () => {
    const app = appWithDb(baseDb());

    const created = await app.request("/api/v1/parents", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ ...createBody, user_profile_id: USER_PARENT_B }),
    });
    expect(created.status).toBe(201);
    const createdBody = await json(created);
    expect(createdBody.data.userProfileId).toBeNull();
    expect(createdBody.data.inviteStatus).toBe("pending");

    expect(
      (
        await app.request("/api/v1/parents", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify(createBody),
        })
      ).status,
    ).toBe(403);

    const teacherList = await app.request(`/api/v1/parents?institute_id=${INST_A}`, {
      headers: auth("token-teacher"),
    });
    expect(teacherList.status).toBe(200);

    const parentList = await app.request(`/api/v1/parents?institute_id=${INST_A}`, {
      headers: auth("token-parent"),
    });
    expect(parentList.status).toBe(200);
    const parentIds = ((await json(parentList)).data as Array<{ id: string }>).map((r) => r.id);
    expect(parentIds).toEqual([PARENT_A]);

    expect(
      (await app.request(`/api/v1/parents/${PARENT_B}`, { headers: auth("token-parent") })).status,
    ).toBe(403);

    const studentList = await app.request(`/api/v1/parents?institute_id=${INST_A}`, {
      headers: auth("token-student"),
    });
    expect(studentList.status).toBe(200);
    const studentParentIds = ((await json(studentList)).data as Array<{ id: string }>).map(
      (r) => r.id,
    );
    expect(studentParentIds).toEqual([PARENT_A]);
  });
});

describe("parents — guardian links", () => {
  it("creates/updates/deletes links with graph checks", async () => {
    const app = appWithDb(baseDb());

    const linked = await app.request(`/api/v1/parents/${PARENT_A}/links`, {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        student_id: STUDENT_B,
        relationship: "guardian",
        is_primary: true,
      }),
    });
    expect(linked.status).toBe(201);
    const linkBody = await json(linked);
    expect(linkBody.data.studentId).toBe(STUDENT_B);
    expect(linkBody.data.isPrimary).toBe(true);

    const patched = await app.request(
      `/api/v1/parents/${PARENT_A}/links/${linkBody.data.id}`,
      {
        method: "PATCH",
        headers: jsonHeaders("token-admin"),
        body: JSON.stringify({ is_emergency_contact: true }),
      },
    );
    expect(patched.status).toBe(200);
    expect((await json(patched)).data.isEmergencyContact).toBe(true);

    expect(
      (
        await app.request(`/api/v1/parents/${PARENT_A}/links/${linkBody.data.id}`, {
          method: "DELETE",
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(200);

    expect(
      (
        await app.request(`/api/v1/parents/${PARENT_A}/links`, {
          method: "POST",
          headers: jsonHeaders("token-parent"),
          body: JSON.stringify({
            student_id: STUDENT_B,
            relationship: "father",
          }),
        })
      ).status,
    ).toBe(403);
  });

  it("does not disclose sibling studentIds in learner parent links", async () => {
    const db = baseDb();
    db.guardian_link.push({
      id: "bc333333-3333-4333-8333-333333333333",
      institute_id: INST_A,
      student_id: STUDENT_B,
      parent_id: PARENT_A,
      relationship: "guardian",
      is_primary: false,
      is_emergency_contact: false,
      status: "active",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    });
    const app = appWithDb(db);

    const res = await app.request(`/api/v1/parents/${PARENT_A}`, {
      headers: auth("token-student"),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    const linkStudentIds = (body.data.links as Array<{ studentId: string }>).map(
      (l) => l.studentId,
    );
    expect(linkStudentIds).toEqual([STUDENT_A]);
    expect(linkStudentIds).not.toContain(STUDENT_B);

    const parentView = await app.request(`/api/v1/parents/${PARENT_A}`, {
      headers: auth("token-parent"),
    });
    expect(parentView.status).toBe(200);
    const parentLinks = (
      (await json(parentView)).data.links as Array<{ studentId: string }>
    ).map((l) => l.studentId);
    expect(parentLinks).toContain(STUDENT_A);
    expect(parentLinks).toContain(STUDENT_B);
  });
});

describe("parents — validation and soft delete", () => {
  it("rejects PAR-* path ids and soft-deletes parent+links", async () => {
    const app = appWithDb(baseDb());
    expect(
      (await app.request(`/api/v1/parents/PAR-2201`, { headers: auth("token-admin") })).status,
    ).toBe(400);

    const del = await app.request(`/api/v1/parents/${PARENT_A}`, {
      method: "DELETE",
      headers: auth("token-admin"),
    });
    expect(del.status).toBe(200);

    expect(
      (await app.request(`/api/v1/parents/${PARENT_A}`, { headers: auth("token-admin") })).status,
    ).toBe(404);

    const list = await app.request(`/api/v1/parents?institute_id=${INST_A}`, {
      headers: auth("token-admin"),
    });
    const ids = ((await json(list)).data as Array<{ id: string }>).map((r) => r.id);
    expect(ids).not.toContain(PARENT_A);
  });
});
