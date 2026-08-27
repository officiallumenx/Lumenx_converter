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
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_STUDENT = "aa333333-3333-4333-8333-333333333333";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const MEMBER_PARENT = "aa555555-5555-4555-8555-555555555555";
const PARENT_A = "ba111111-1111-4111-8111-111111111111";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const YEAR_A = "cc111111-1111-4111-8111-111111111111";
const YEAR_B = "cc222222-2222-4222-8222-222222222222";
const YEAR_OTHER = "cc333333-3333-4333-8333-333333333333";
const CLASS_A = "cd111111-1111-4111-8111-111111111111";
const CLASS_OTHER = "cd222222-2222-4222-8222-222222222222";
const SECTION_A = "ce111111-1111-4111-8111-111111111111";
const SECTION_OTHER = "ce222222-2222-4222-8222-222222222222";
const SUBJECT_A = "cf111111-1111-4111-8111-111111111111";
const SUBJECT_OTHER = "cf222222-2222-4222-8222-222222222222";
const SUBJECT_HIDDEN = "cf333333-3333-4333-8333-333333333333";
const SUBJECT_DRAFT = "cf444444-4444-4444-8444-444444444444";
const ENROLL_A = "cg111111-1111-4111-8111-111111111111";
const ENROLL_INACTIVE = "cg222222-2222-4222-8222-222222222222";
const YEAR_INACTIVE_ONLY = "cc444444-4444-4444-8444-444444444444";
const CLASS_INACTIVE_ONLY = "cd333333-3333-4333-8333-333333333333";
const SECTION_INACTIVE_ONLY = "ce333333-3333-4333-8333-333333333333";
const TEACHER_A = "bb111111-1111-4111-8111-111111111111";

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
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_STUDENT, user_id: USER_STUDENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
    { id: MEMBER_PARENT, user_id: USER_PARENT, institute_id: INST_A, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_STUDENT, role_code: "student" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
  ];
  db.parent = [
    { id: PARENT_A, institute_id: INST_A, user_profile_id: USER_PARENT, deleted_at: null },
  ];
  db.guardian_link = [
    {
      id: "gl111111-1111-4111-8111-111111111111",
      institute_id: INST_A,
      parent_id: PARENT_A,
      student_id: STUDENT_A,
      status: "active",
      deleted_at: null,
    },
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
    {
      id: TEACHER_A,
      institute_id: INST_A,
      user_profile_id: USER_TEACHER,
      display_name: "Ananya",
      status: "active",
      deleted_at: null,
    },
  ];
  db.academic_year = [
    {
      id: YEAR_A,
      institute_id: INST_A,
      name: "2026-27",
      code: "2026-27",
      starts_on: "2026-04-01",
      ends_on: "2027-03-31",
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: YEAR_B,
      institute_id: INST_A,
      name: "2025-26",
      code: "2025-26",
      starts_on: "2025-04-01",
      ends_on: "2026-03-31",
      status: "completed",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: YEAR_OTHER,
      institute_id: INST_B,
      name: "Other Year",
      code: "OY",
      starts_on: "2026-04-01",
      ends_on: "2027-03-31",
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.class = [
    {
      id: CLASS_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      name: "Grade 10",
      code: "10",
      sort_order: 10,
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: CLASS_OTHER,
      institute_id: INST_B,
      academic_year_id: YEAR_OTHER,
      name: "Other Class",
      code: "X",
      sort_order: 0,
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.section = [
    {
      id: SECTION_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      name: "A",
      code: "A",
      capacity: 40,
      room: "R1",
      sort_order: 0,
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: SECTION_OTHER,
      institute_id: INST_B,
      academic_year_id: YEAR_OTHER,
      class_id: CLASS_OTHER,
      name: "Z",
      code: "Z",
      capacity: null,
      room: null,
      sort_order: 0,
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.subject = [
    {
      id: SUBJECT_A,
      institute_id: INST_A,
      name: "Mathematics",
      code: "MTH 101",
      category: "Sciences",
      periods_per_week: 6,
      applicable_class_codes: ["10"],
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: SUBJECT_HIDDEN,
      institute_id: INST_A,
      name: "Philosophy",
      code: "PHIL 101",
      category: "Humanities",
      periods_per_week: 3,
      applicable_class_codes: ["12"],
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: SUBJECT_OTHER,
      institute_id: INST_B,
      name: "Other Subj",
      code: "OTH",
      category: "Other",
      periods_per_week: 2,
      applicable_class_codes: ["X"],
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: SUBJECT_DRAFT,
      institute_id: INST_A,
      name: "Draft Math",
      code: "MTH DRAFT",
      category: "Sciences",
      periods_per_week: 4,
      applicable_class_codes: ["10"],
      status: "draft",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.enrollment = [
    {
      id: ENROLL_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      student_id: STUDENT_A,
      class_id: CLASS_A,
      section_id: SECTION_A,
      status: "active",
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

describe("academics — authentication", () => {
  it("returns 401 without JWT on structure routes", async () => {
    const app = appWithDb(baseDb());
    expect((await app.request(`/api/v1/academic-years?institute_id=${INST_A}`)).status).toBe(401);
    expect((await app.request(`/api/v1/classes?institute_id=${INST_A}`)).status).toBe(401);
    expect((await app.request(`/api/v1/sections?institute_id=${INST_A}`)).status).toBe(401);
    expect((await app.request(`/api/v1/subjects?institute_id=${INST_A}`)).status).toBe(401);
  });
});

describe("academics — tenant isolation", () => {
  it("blocks cross-institute list/get/create", async () => {
    const app = appWithDb(baseDb());
    expect(
      (await app.request(`/api/v1/academic-years?institute_id=${INST_B}`, { headers: auth("token-admin") }))
        .status,
    ).toBe(403);
    expect(
      (await app.request(`/api/v1/academic-years/${YEAR_OTHER}`, { headers: auth("token-admin") }))
        .status,
    ).toBe(403);
    expect(
      (await app.request(`/api/v1/classes/${CLASS_OTHER}`, { headers: auth("token-admin") })).status,
    ).toBe(403);
    expect(
      (await app.request(`/api/v1/sections/${SECTION_OTHER}`, { headers: auth("token-admin") })).status,
    ).toBe(403);
    expect(
      (await app.request(`/api/v1/subjects/${SUBJECT_OTHER}`, { headers: auth("token-admin") })).status,
    ).toBe(403);
    expect(
      (
        await app.request("/api/v1/classes", {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({
            institute_id: INST_B,
            academic_year_id: YEAR_OTHER,
            name: "X",
            code: "X",
          }),
        })
      ).status,
    ).toBe(403);
  });
});

describe("academics — RBAC and learner scope", () => {
  it("staff write; teachers read full; learners scoped by enrollment", async () => {
    const app = appWithDb(baseDb());

    const yearCreate = await app.request("/api/v1/academic-years", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "2027-28",
        code: "2027-28",
        starts_on: "2027-04-01",
        ends_on: "2028-03-31",
        status: "upcoming",
      }),
    });
    expect(yearCreate.status).toBe(201);

    expect(
      (
        await app.request("/api/v1/academic-years", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({
            institute_id: INST_A,
            name: "Nope",
            code: "NOPE",
            starts_on: "2027-04-01",
            ends_on: "2028-03-31",
          }),
        })
      ).status,
    ).toBe(403);

    const teacherYears = await app.request(`/api/v1/academic-years?institute_id=${INST_A}`, {
      headers: auth("token-teacher"),
    });
    expect(teacherYears.status).toBe(200);
    expect(((await json(teacherYears)).data as unknown[]).length).toBeGreaterThanOrEqual(2);

    const studentYears = await app.request(`/api/v1/academic-years?institute_id=${INST_A}`, {
      headers: auth("token-student"),
    });
    expect(studentYears.status).toBe(200);
    const studentYearIds = ((await json(studentYears)).data as Array<{ id: string }>).map(
      (r) => r.id,
    );
    expect(studentYearIds).toEqual([YEAR_A]);

    const studentSubjects = await app.request(`/api/v1/subjects?institute_id=${INST_A}`, {
      headers: auth("token-student"),
    });
    expect(studentSubjects.status).toBe(200);
    const subjectIds = ((await json(studentSubjects)).data as Array<{ id: string }>).map(
      (r) => r.id,
    );
    expect(subjectIds).toContain(SUBJECT_A);
    expect(subjectIds).not.toContain(SUBJECT_HIDDEN);
    expect(subjectIds).not.toContain(SUBJECT_DRAFT);

    expect(
      (await app.request(`/api/v1/subjects/${SUBJECT_HIDDEN}`, { headers: auth("token-parent") }))
        .status,
    ).toBe(403);
    expect(
      (await app.request(`/api/v1/subjects/${SUBJECT_DRAFT}`, { headers: auth("token-student") }))
        .status,
    ).toBe(403);

    const parentSections = await app.request(`/api/v1/sections?institute_id=${INST_A}`, {
      headers: auth("token-parent"),
    });
    expect(parentSections.status).toBe(200);
    expect(((await json(parentSections)).data as Array<{ id: string }>).map((r) => r.id)).toEqual([
      SECTION_A,
    ]);
  });
});

describe("academics — inactive enrollment does not grant scope", () => {
  it("denies learner when only inactive enrollment exists", async () => {
    const db = baseDb();
    db.enrollment = [
      {
        id: ENROLL_INACTIVE,
        institute_id: INST_A,
        academic_year_id: YEAR_INACTIVE_ONLY,
        student_id: STUDENT_A,
        class_id: CLASS_INACTIVE_ONLY,
        section_id: SECTION_INACTIVE_ONLY,
        status: "transferred",
        deleted_at: null,
      },
    ];
    db.academic_year.push({
      id: YEAR_INACTIVE_ONLY,
      institute_id: INST_A,
      name: "Old",
      code: "OLD",
      starts_on: "2024-04-01",
      ends_on: "2025-03-31",
      status: "completed",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    });
    db.class.push({
      id: CLASS_INACTIVE_ONLY,
      institute_id: INST_A,
      academic_year_id: YEAR_INACTIVE_ONLY,
      name: "Old Class",
      code: "9",
      sort_order: 9,
      status: "inactive",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    });
    db.section.push({
      id: SECTION_INACTIVE_ONLY,
      institute_id: INST_A,
      academic_year_id: YEAR_INACTIVE_ONLY,
      class_id: CLASS_INACTIVE_ONLY,
      name: "Z",
      code: "Z",
      capacity: null,
      room: null,
      sort_order: 0,
      status: "inactive",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    });

    const app = appWithDb(db);
    expect(
      (await app.request(`/api/v1/academic-years?institute_id=${INST_A}`, {
        headers: auth("token-student"),
      })).status,
    ).toBe(403);
    expect(
      (await app.request(`/api/v1/subjects?institute_id=${INST_A}`, {
        headers: auth("token-parent"),
      })).status,
    ).toBe(403);
  });
});

describe("academics — graph integrity, validation, soft delete", () => {
  it("rejects bad graph/legacy ids and soft-deletes", async () => {
    const app = appWithDb(baseDb());

    expect(
      (await app.request("/api/v1/classes/CLS-10", { headers: auth("token-admin") })).status,
    ).toBe(400);

    expect(
      (
        await app.request("/api/v1/sections", {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({
            institute_id: INST_A,
            academic_year_id: YEAR_B,
            class_id: CLASS_A,
            name: "B",
            code: "B",
          }),
        })
      ).status,
    ).toBe(400);

    const classCreate = await app.request("/api/v1/classes", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        name: "Grade 11",
        code: "11",
        sort_order: 11,
      }),
    });
    expect(classCreate.status).toBe(201);
    const newClassId = (await json(classCreate)).data.id as string;

    const sectionCreate = await app.request("/api/v1/sections", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: newClassId,
        name: "B",
        code: "B",
        capacity: 35,
        room: "Lab-2",
      }),
    });
    expect(sectionCreate.status).toBe(201);

    const subjectCreate = await app.request("/api/v1/subjects", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Physics",
        code: "PHY 201",
        category: "Sciences",
        periods_per_week: 5,
        applicable_class_codes: ["10", "11"],
        status: "active",
      }),
    });
    expect(subjectCreate.status).toBe(201);

    expect(
      (
        await app.request(`/api/v1/classes/${CLASS_A}`, {
          method: "DELETE",
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(200);
    expect(
      (await app.request(`/api/v1/classes/${CLASS_A}`, { headers: auth("token-admin") })).status,
    ).toBe(404);
  });
});
