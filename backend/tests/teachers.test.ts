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
const USER_TEACHER2 = "66666666-6666-4666-8666-666666666666";
const USER_STUDENT = "33333333-3333-4333-8333-333333333333";
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const USER_PARENT = "55555555-5555-4555-8555-555555555555";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_TEACHER2 = "aa666666-6666-4666-8666-666666666666";
const MEMBER_STUDENT = "aa333333-3333-4333-8333-333333333333";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const MEMBER_PARENT = "aa555555-5555-4555-8555-555555555555";
const TEACHER_A = "bb111111-1111-4111-8111-111111111111";
const TEACHER_B = "bb222222-2222-4222-8222-222222222222";
const TEACHER_OTHER = "bb333333-3333-4333-8333-333333333333";
const TEACHER_DELETED = "bb444444-4444-4444-8444-444444444444";
const PARENT_A = "ba111111-1111-4111-8111-111111111111";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";

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

function teacherRow(
  id: string,
  instituteId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    institute_id: instituteId,
    user_profile_id: null,
    legacy_code: null,
    employee_id: null,
    display_name: "Teacher",
    phone: null,
    email: null,
    department: "Mathematics",
    qualification: null,
    date_of_birth: null,
    joined_on: null,
    teaching_scope: "subject_teacher",
    portal_access_level: "faculty_grading",
    status: "active",
    subjects: ["Mathematics"],
    assigned_section_labels: ["10-A"],
    source_career_application_id: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    deleted_at: null,
    ...overrides,
  };
}

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.user_profile = [
    { id: USER_ADMIN, display_name: "Admin", email: "a@x.com", status: "active", deleted_at: null },
    { id: USER_TEACHER, display_name: "Teacher", email: "t@x.com", status: "active", deleted_at: null },
    { id: USER_TEACHER2, display_name: "Teacher2", email: "t2@x.com", status: "active", deleted_at: null },
    { id: USER_STUDENT, display_name: "Student", email: "s@x.com", status: "active", deleted_at: null },
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
    { id: USER_PARENT, display_name: "Parent", email: "p@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER2, user_id: USER_TEACHER2, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_STUDENT, user_id: USER_STUDENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
    { id: MEMBER_PARENT, user_id: USER_PARENT, institute_id: INST_A, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_TEACHER2, role_code: "teacher" },
    { membership_id: MEMBER_STUDENT, role_code: "student" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
  ];
  db.parent = [
    { id: PARENT_A, institute_id: INST_A, user_profile_id: USER_PARENT, deleted_at: null },
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
  ];
  db.teacher = [
    teacherRow(TEACHER_A, INST_A, {
      user_profile_id: USER_TEACHER,
      display_name: "Ananya Iyer",
      legacy_code: "T-1042",
      employee_id: "EMP-2024-1042",
      phone: "9000000001",
    }),
    teacherRow(TEACHER_B, INST_A, {
      user_profile_id: USER_TEACHER2,
      display_name: "Ravi Mehta",
      teaching_scope: "dual_role",
      phone: "9000000002",
    }),
    teacherRow(TEACHER_OTHER, INST_B, {
      display_name: "Other Faculty",
      phone: "9000000099",
    }),
    teacherRow(TEACHER_DELETED, INST_A, {
      display_name: "Gone Teacher",
      deleted_at: "2026-08-10T00:00:00.000Z",
    }),
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
        "token-teacher2": USER_TEACHER2,
        "token-student": USER_STUDENT,
        "token-other": USER_OTHER,
        "token-parent": USER_PARENT,
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
  display_name: "New Faculty",
  department: "Science",
  teaching_scope: "subject_teacher",
  portal_access_level: "faculty_only",
  employee_id: "EMP-3001",
  legacy_code: "T-3001",
  subjects: ["Physics"],
  assigned_section_labels: ["9-A"],
};

describe("teachers — authentication", () => {
  it("returns 401 without/invalid JWT", async () => {
    const app = appWithDb(baseDb());
    expect((await app.request(`/api/v1/teachers?institute_id=${INST_A}`)).status).toBe(401);
    expect(
      (await app.request(`/api/v1/teachers?institute_id=${INST_A}`, { headers: auth("bad") }))
        .status,
    ).toBe(401);
  });
});

describe("teachers — tenant isolation", () => {
  it("blocks cross-institute list/get/create/patch/delete", async () => {
    const app = appWithDb(baseDb());
    expect(
      (await app.request(`/api/v1/teachers?institute_id=${INST_B}`, { headers: auth("token-admin") }))
        .status,
    ).toBe(403);
    expect(
      (await app.request(`/api/v1/teachers/${TEACHER_OTHER}`, { headers: auth("token-admin") }))
        .status,
    ).toBe(403);
    expect(
      (
        await app.request("/api/v1/teachers", {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({ ...createBody, institute_id: INST_B }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request(`/api/v1/teachers/${TEACHER_OTHER}`, {
          method: "PATCH",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({ display_name: "X" }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request(`/api/v1/teachers/${TEACHER_OTHER}`, {
          method: "DELETE",
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(403);
  });
});

describe("teachers — RBAC and privacy", () => {
  it("staff writes; teachers read directory; learners/parents denied", async () => {
    const app = appWithDb(baseDb());

    const created = await app.request("/api/v1/teachers", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ ...createBody, user_profile_id: USER_TEACHER2 }),
    });
    expect(created.status).toBe(201);
    const createdBody = await json(created);
    expect(createdBody.data.userProfileId).toBeNull();
    expect(createdBody.data.displayName).toBe("New Faculty");
    expect(createdBody.data.subjects).toEqual(["Physics"]);

    expect(
      (
        await app.request("/api/v1/teachers", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify(createBody),
        })
      ).status,
    ).toBe(403);

    const teacherList = await app.request(`/api/v1/teachers?institute_id=${INST_A}`, {
      headers: auth("token-teacher"),
    });
    expect(teacherList.status).toBe(200);
    const ids = ((await json(teacherList)).data as Array<{ id: string }>).map((r) => r.id);
    expect(ids).toContain(TEACHER_A);
    expect(ids).toContain(TEACHER_B);

    for (const token of ["token-student", "token-parent"]) {
      expect(
        (await app.request(`/api/v1/teachers?institute_id=${INST_A}`, { headers: auth(token) }))
          .status,
      ).toBe(403);
      expect(
        (await app.request(`/api/v1/teachers/${TEACHER_A}`, { headers: auth(token) })).status,
      ).toBe(403);
    }

    expect(
      (
        await app.request(`/api/v1/teachers/${TEACHER_B}`, {
          method: "PATCH",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({ display_name: "Nope" }),
        })
      ).status,
    ).toBe(403);
  });
});

describe("teachers — validation and soft delete", () => {
  it("rejects T-* path ids and soft-deletes", async () => {
    const app = appWithDb(baseDb());
    expect(
      (await app.request(`/api/v1/teachers/T-1042`, { headers: auth("token-admin") })).status,
    ).toBe(400);

    const patched = await app.request(`/api/v1/teachers/${TEACHER_A}`, {
      method: "PATCH",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ status: "on_leave", portal_access_level: "read_only" }),
    });
    expect(patched.status).toBe(200);
    const patchedBody = await json(patched);
    expect(patchedBody.data.status).toBe("on_leave");
    expect(patchedBody.data.portalAccessLevel).toBe("read_only");

    expect(
      (
        await app.request(`/api/v1/teachers/${TEACHER_A}`, {
          method: "DELETE",
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(200);

    expect(
      (await app.request(`/api/v1/teachers/${TEACHER_A}`, { headers: auth("token-admin") })).status,
    ).toBe(404);
    expect(
      (await app.request(`/api/v1/teachers/${TEACHER_DELETED}`, { headers: auth("token-admin") }))
        .status,
    ).toBe(404);
  });
});
