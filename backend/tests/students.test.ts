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
const USER_STUDENT_B = "77777777-7777-4777-8777-777777777777";
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const USER_PARENT = "55555555-5555-4555-8555-555555555555";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_STUDENT = "aa333333-3333-4333-8333-333333333333";
const MEMBER_STUDENT_B = "aa777777-7777-4777-8777-777777777777";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const MEMBER_PARENT = "aa555555-5555-4555-8555-555555555555";
const PARENT_A = "ba111111-1111-4111-8111-111111111111";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const STUDENT_B = "ac222222-2222-4222-8222-222222222222";
const STUDENT_OTHER = "ac333333-3333-4333-8333-333333333333";
const STUDENT_DELETED = "ac444444-4444-4444-8444-444444444444";

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

function studentRow(
  id: string,
  instituteId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    institute_id: instituteId,
    user_profile_id: null,
    legacy_code: null,
    admission_number: null,
    source_admission_application_id: null,
    first_name: "Ada",
    surname: "Lovelace",
    display_name: "Ada Lovelace",
    gender: "female",
    date_of_birth: "2012-01-01",
    address: "1 Campus Rd",
    class_label: "10",
    section_label: "A",
    roll_no: "1",
    status: "active",
    access_status: "active",
    blood_group: null,
    emergency_contact: null,
    house: null,
    photo_asset_path: null,
    id_card_issued_on: null,
    id_card_valid_till: null,
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
    { id: USER_STUDENT, display_name: "Student", email: "s@x.com", status: "active", deleted_at: null },
    { id: USER_STUDENT_B, display_name: "StudentB", email: "sb@x.com", status: "active", deleted_at: null },
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
    { id: USER_PARENT, display_name: "Parent", email: "p@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_STUDENT, user_id: USER_STUDENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_STUDENT_B, user_id: USER_STUDENT_B, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
    { id: MEMBER_PARENT, user_id: USER_PARENT, institute_id: INST_A, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_STUDENT, role_code: "student" },
    { membership_id: MEMBER_STUDENT_B, role_code: "student" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
  ];
  db.parent = [
    { id: PARENT_A, institute_id: INST_A, user_profile_id: USER_PARENT, deleted_at: null },
  ];
  db.guardian_link = [
    {
      id: "bc111111-1111-4111-8111-111111111111",
      institute_id: INST_A,
      student_id: STUDENT_A,
      parent_id: PARENT_A,
      relationship: "father",
      status: "active",
      deleted_at: null,
    },
  ];
  db.student = [
    studentRow(STUDENT_A, INST_A, {
      user_profile_id: USER_STUDENT,
      first_name: "Asha",
      surname: "Patel",
      display_name: "Asha Patel",
      legacy_code: "STU-1042",
    }),
    studentRow(STUDENT_B, INST_A, {
      user_profile_id: USER_STUDENT_B,
      first_name: "Bala",
      surname: "Khan",
      display_name: "Bala Khan",
      class_label: "9",
      section_label: "B",
      roll_no: "5",
    }),
    studentRow(STUDENT_OTHER, INST_B, {
      first_name: "Other",
      surname: "Kid",
      display_name: "Other Kid",
    }),
    studentRow(STUDENT_DELETED, INST_A, {
      first_name: "Gone",
      surname: "Student",
      display_name: "Gone Student",
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
        "token-student": USER_STUDENT,
        "token-student-b": USER_STUDENT_B,
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
  first_name: "Neha",
  surname: "Shah",
  gender: "female",
  address: "12 Lake View",
  class_label: "10",
  section_label: "A",
  roll_no: "12",
  legacy_code: "STU-2001",
};

describe("students — authentication", () => {
  it("returns 401 without/invalid JWT", async () => {
    const app = appWithDb(baseDb());
    expect((await app.request(`/api/v1/students?institute_id=${INST_A}`)).status).toBe(401);
    expect(
      (
        await app.request(`/api/v1/students?institute_id=${INST_A}`, {
          headers: auth("bad"),
        })
      ).status,
    ).toBe(401);
  });
});

describe("students — tenant isolation", () => {
  it("blocks cross-institute list/get/create/patch/delete", async () => {
    const app = appWithDb(baseDb());
    expect(
      (
        await app.request(`/api/v1/students?institute_id=${INST_B}`, {
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(403);
    expect(
      (await app.request(`/api/v1/students/${STUDENT_OTHER}`, { headers: auth("token-admin") }))
        .status,
    ).toBe(403);
    expect(
      (
        await app.request("/api/v1/students", {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({ ...createBody, institute_id: INST_B }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request(`/api/v1/students/${STUDENT_OTHER}`, {
          method: "PATCH",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({ first_name: "X" }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request(`/api/v1/students/${STUDENT_OTHER}`, {
          method: "DELETE",
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(403);
  });
});

describe("students — RBAC", () => {
  it("allows staff write create/patch/delete; teacher read-only; learner/parent cannot mutate", async () => {
    const app = appWithDb(baseDb());

    const created = await app.request("/api/v1/students", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify(createBody),
    });
    expect(created.status).toBe(201);
    const createdBody = await json(created);
    expect(createdBody.data.displayName).toBe("Neha Shah");
    expect(createdBody.data.userProfileId).toBeNull();
    expect(createdBody.data.status).toBe("active");

    expect(
      (
        await app.request("/api/v1/students", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify(createBody),
        })
      ).status,
    ).toBe(403);

    for (const token of ["token-student", "token-parent", "token-teacher"]) {
      expect(
        (
          await app.request(`/api/v1/students/${STUDENT_A}`, {
            method: "PATCH",
            headers: jsonHeaders(token),
            body: JSON.stringify({ first_name: "Nope" }),
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await app.request(`/api/v1/students/${STUDENT_A}`, {
            method: "DELETE",
            headers: auth(token),
          })
        ).status,
      ).toBe(403);
    }

    const teacherList = await app.request(`/api/v1/students?institute_id=${INST_A}`, {
      headers: auth("token-teacher"),
    });
    expect(teacherList.status).toBe(200);
    expect(((await json(teacherList)).data as unknown[]).length).toBeGreaterThanOrEqual(2);
  });
});

describe("students — privacy", () => {
  it("learner sees only self; parent only linked child; no peer disclosure", async () => {
    const app = appWithDb(baseDb());

    const studentList = await app.request(`/api/v1/students?institute_id=${INST_A}`, {
      headers: auth("token-student"),
    });
    expect(studentList.status).toBe(200);
    const studentIds = ((await json(studentList)).data as Array<{ id: string }>).map((r) => r.id);
    expect(studentIds).toEqual([STUDENT_A]);

    expect(
      (await app.request(`/api/v1/students/${STUDENT_B}`, { headers: auth("token-student") }))
        .status,
    ).toBe(403);
    expect(
      (await app.request(`/api/v1/students/${STUDENT_A}`, { headers: auth("token-student") }))
        .status,
    ).toBe(200);

    const parentList = await app.request(`/api/v1/students?institute_id=${INST_A}`, {
      headers: auth("token-parent"),
    });
    expect(parentList.status).toBe(200);
    const parentIds = ((await json(parentList)).data as Array<{ id: string }>).map((r) => r.id);
    expect(parentIds).toEqual([STUDENT_A]);
    expect(
      (await app.request(`/api/v1/students/${STUDENT_B}`, { headers: auth("token-parent") }))
        .status,
    ).toBe(403);
  });
});

describe("students — validation and legacy IDs", () => {
  it("rejects non-UUID path and accepts legacy_code as data field only", async () => {
    const app = appWithDb(baseDb());
    expect(
      (await app.request(`/api/v1/students/STU-1042`, { headers: auth("token-admin") })).status,
    ).toBe(400);

    const created = await app.request("/api/v1/students", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        ...createBody,
        legacy_code: "STU-3001",
        user_profile_id: USER_STUDENT_B,
      }),
    });
    expect(created.status).toBe(201);
    const body = await json(created);
    expect(body.data.legacyCode).toBe("STU-3001");
    expect(body.data.userProfileId).toBeNull();
  });
});

describe("students — lifecycle and soft delete", () => {
  it("patches access/status and soft-deletes", async () => {
    const app = appWithDb(baseDb());

    const patched = await app.request(`/api/v1/students/${STUDENT_A}`, {
      method: "PATCH",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ access_status: "hold", status: "watch" }),
    });
    expect(patched.status).toBe(200);
    const patchedBody = await json(patched);
    expect(patchedBody.data.accessStatus).toBe("hold");
    expect(patchedBody.data.status).toBe("watch");

    const del = await app.request(`/api/v1/students/${STUDENT_A}`, {
      method: "DELETE",
      headers: auth("token-admin"),
    });
    expect(del.status).toBe(200);

    const list = await app.request(`/api/v1/students?institute_id=${INST_A}`, {
      headers: auth("token-admin"),
    });
    const ids = ((await json(list)).data as Array<{ id: string }>).map((r) => r.id);
    expect(ids).not.toContain(STUDENT_A);
    expect(ids).not.toContain(STUDENT_DELETED);

    expect(
      (await app.request(`/api/v1/students/${STUDENT_A}`, { headers: auth("token-admin") })).status,
    ).toBe(404);
    expect(
      (await app.request(`/api/v1/students/${STUDENT_DELETED}`, { headers: auth("token-admin") }))
        .status,
    ).toBe(404);
  });
});
