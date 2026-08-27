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
const PARENT_A = "ba111111-1111-4111-8111-111111111111";
const SECTION_A = "cc111111-1111-4111-8111-111111111111";
const SECTION_B = "cc222222-2222-4222-8222-222222222222";
const SECTION_C = "cc333333-3333-4333-8333-333333333333";
const YEAR_A = "ee111111-1111-4111-8111-111111111111";
const YEAR_B = "ee222222-2222-4222-8222-222222222222";
const CLASS_A = "ff111111-1111-4111-8111-111111111111";
const CLASS_B = "ff222222-2222-4222-8222-222222222222";
const CLASS_C = "ff333333-3333-4333-8333-333333333333";
const ASSIGN_A = "ab111111-1111-4111-8111-111111111111";
const ASSIGN_B = "ab222222-2222-4222-8222-222222222222";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const SUBJECT_A = "dd111111-1111-4111-8111-111111111111";
const DAY_DRAFT = "af111111-1111-4111-8111-111111111111";
const DAY_SUBMITTED = "af222222-2222-4222-8222-222222222222";
const DAY_OTHER_TEACHER = "af333333-3333-4333-8333-333333333333";
const DAY_OTHER_INST = "af444444-4444-4444-8444-444444444444";
const DAY_DELETED = "af555555-5555-4555-8555-555555555555";
const ROW_1 = "b0111111-1111-4111-8111-111111111111";
const ROW_2 = "b0222222-2222-4222-8222-222222222222";
const ROW_3 = "b0333333-3333-4333-8333-333333333333";

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
  db.teacher = [
    { id: TEACHER_A, institute_id: INST_A, user_profile_id: USER_TEACHER, status: "active", deleted_at: null },
    { id: TEACHER_B, institute_id: INST_A, user_profile_id: USER_TEACHER2, status: "active", deleted_at: null },
  ];
  db.parent = [{ id: PARENT_A, institute_id: INST_A, user_profile_id: USER_PARENT, deleted_at: null }];
  db.student = [
    { id: STUDENT_A, institute_id: INST_A, user_profile_id: USER_STUDENT, deleted_at: null },
  ];
  db.academic_year = [
    { id: YEAR_A, institute_id: INST_A, deleted_at: null },
    { id: YEAR_B, institute_id: INST_B, deleted_at: null },
  ];
  db.subject = [{ id: SUBJECT_A, institute_id: INST_A, deleted_at: null }];
  db.section = [
    { id: SECTION_A, institute_id: INST_A, academic_year_id: YEAR_A, class_id: CLASS_A, deleted_at: null },
    { id: SECTION_B, institute_id: INST_B, academic_year_id: YEAR_B, class_id: CLASS_B, deleted_at: null },
    { id: SECTION_C, institute_id: INST_A, academic_year_id: YEAR_A, class_id: CLASS_C, deleted_at: null },
  ];
  db.teacher_assignment = [
    {
      id: ASSIGN_A,
      teacher_id: TEACHER_A,
      institute_id: INST_A,
      section_id: SECTION_A,
      subject_id: SUBJECT_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      status: "active",
      deleted_at: null,
    },
    {
      id: ASSIGN_B,
      teacher_id: TEACHER_B,
      institute_id: INST_A,
      section_id: SECTION_C,
      subject_id: SUBJECT_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_C,
      status: "active",
      deleted_at: null,
    },
  ];
  db.diary_day = [
    {
      id: DAY_DRAFT,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      teacher_id: TEACHER_A,
      diary_date: "2026-08-26",
      scope: "subject",
      submitted_at: null,
      created_at: "2026-08-26T00:00:00.000Z",
      updated_at: "2026-08-26T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: DAY_SUBMITTED,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      teacher_id: TEACHER_A,
      diary_date: "2026-08-25",
      scope: "subject",
      submitted_at: "2026-08-26T08:00:00.000Z",
      created_at: "2026-08-25T00:00:00.000Z",
      updated_at: "2026-08-26T08:00:00.000Z",
      deleted_at: null,
    },
    {
      id: DAY_OTHER_TEACHER,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      teacher_id: TEACHER_B,
      diary_date: "2026-08-26",
      scope: "subject",
      submitted_at: null,
      created_at: "2026-08-26T00:00:00.000Z",
      updated_at: "2026-08-26T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: DAY_OTHER_INST,
      institute_id: INST_B,
      academic_year_id: YEAR_B,
      teacher_id: TEACHER_A,
      diary_date: "2026-08-26",
      scope: "subject",
      submitted_at: "2026-08-26T08:00:00.000Z",
      created_at: "2026-08-26T00:00:00.000Z",
      updated_at: "2026-08-26T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: DAY_DELETED,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      teacher_id: TEACHER_A,
      diary_date: "2026-08-20",
      scope: "activity",
      submitted_at: null,
      created_at: "2026-08-20T00:00:00.000Z",
      updated_at: "2026-08-20T00:00:00.000Z",
      deleted_at: "2026-08-21T00:00:00.000Z",
    },
  ];
  db.diary_day_row = [
    {
      id: ROW_1,
      institute_id: INST_A,
      diary_day_id: DAY_DRAFT,
      section_id: SECTION_A,
      class_label: "10-A",
      description: "Quadratic equations",
      sort_order: 0,
      created_at: "2026-08-26T00:00:00.000Z",
      updated_at: "2026-08-26T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ROW_2,
      institute_id: INST_A,
      diary_day_id: DAY_SUBMITTED,
      section_id: SECTION_A,
      class_label: "10-A",
      description: "Revision",
      sort_order: 0,
      created_at: "2026-08-25T00:00:00.000Z",
      updated_at: "2026-08-25T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ROW_3,
      institute_id: INST_A,
      diary_day_id: DAY_OTHER_TEACHER,
      section_id: SECTION_C,
      class_label: "9-C",
      description: "Secret draft",
      sort_order: 0,
      created_at: "2026-08-26T00:00:00.000Z",
      updated_at: "2026-08-26T00:00:00.000Z",
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
  academic_year_id: YEAR_A,
  diary_date: "2026-08-27",
  scope: "subject",
  rows: [
    {
      section_id: SECTION_A,
      class_label: "10-A",
      description: "Linear equations practice",
    },
  ],
};

describe("diary — authentication", () => {
  it("returns 401 without/invalid JWT", async () => {
    const app = appWithDb(baseDb());
    expect((await app.request(`/api/v1/diary?institute_id=${INST_A}`)).status).toBe(401);
    expect(
      (await app.request(`/api/v1/diary?institute_id=${INST_A}`, { headers: auth("bad") })).status,
    ).toBe(401);
  });
});

describe("diary — tenant isolation", () => {
  it("blocks cross-institute list/get/create/patch/submit/delete", async () => {
    const app = appWithDb(baseDb());
    expect(
      (await app.request(`/api/v1/diary?institute_id=${INST_B}`, { headers: auth("token-admin") }))
        .status,
    ).toBe(403);
    expect(
      (await app.request(`/api/v1/diary/${DAY_OTHER_INST}`, { headers: auth("token-admin") })).status,
    ).toBe(403);
    expect(
      (
        await app.request("/api/v1/diary", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({ ...createBody, institute_id: INST_B }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request(`/api/v1/diary/${DAY_OTHER_INST}`, {
          method: "PATCH",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({ rows: createBody.rows }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request(`/api/v1/diary/${DAY_OTHER_INST}/submit`, {
          method: "POST",
          headers: auth("token-teacher"),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request(`/api/v1/diary/${DAY_OTHER_INST}`, {
          method: "DELETE",
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(403);
  });
});

describe("diary — RBAC", () => {
  it("allows teacher create and blocks learner/parent/staff content writes", async () => {
    const app = appWithDb(baseDb());
    const created = await app.request("/api/v1/diary", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify(createBody),
    });
    expect(created.status).toBe(201);
    const body = await json(created);
    expect(body.data.submittedAt).toBeNull();
    expect(body.data.teacherId).toBe(TEACHER_A);
    expect(body.data.rows).toHaveLength(1);

    for (const token of ["token-student", "token-parent", "token-admin"]) {
      expect(
        (
          await app.request("/api/v1/diary", {
            method: "POST",
            headers: jsonHeaders(token),
            body: JSON.stringify(createBody),
          })
        ).status,
      ).toBe(403);
    }

    expect(
      (
        await app.request(`/api/v1/diary/${DAY_DRAFT}`, {
          method: "PATCH",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({ rows: createBody.rows }),
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await app.request(`/api/v1/diary/${DAY_DRAFT}/submit`, {
          method: "POST",
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(403);
  });

  it("allows staff governance soft-delete", async () => {
    const app = appWithDb(baseDb());
    const del = await app.request(`/api/v1/diary/${DAY_DRAFT}`, {
      method: "DELETE",
      headers: auth("token-admin"),
    });
    expect(del.status).toBe(200);
  });
});

describe("diary — ownership and privacy", () => {
  it("hides peer teacher diary from teachers; blocks learner/parent entirely", async () => {
    const app = appWithDb(baseDb());

    const teacherList = await app.request(`/api/v1/diary?institute_id=${INST_A}`, {
      headers: auth("token-teacher"),
    });
    expect(teacherList.status).toBe(200);
    const teacherIds = ((await json(teacherList)).data as Array<{ id: string }>).map((r) => r.id);
    expect(teacherIds).toContain(DAY_DRAFT);
    expect(teacherIds).not.toContain(DAY_OTHER_TEACHER);

    expect(
      (await app.request(`/api/v1/diary/${DAY_OTHER_TEACHER}`, { headers: auth("token-teacher") }))
        .status,
    ).toBe(403);

    expect(
      (
        await app.request(`/api/v1/diary/${DAY_OTHER_TEACHER}`, {
          method: "PATCH",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({ rows: createBody.rows }),
        })
      ).status,
    ).toBe(403);

    for (const token of ["token-student", "token-parent"]) {
      expect(
        (await app.request(`/api/v1/diary?institute_id=${INST_A}`, { headers: auth(token) })).status,
      ).toBe(403);
      expect(
        (await app.request(`/api/v1/diary/${DAY_SUBMITTED}`, { headers: auth(token) })).status,
      ).toBe(403);
    }

    const adminList = await app.request(`/api/v1/diary?institute_id=${INST_A}`, {
      headers: auth("token-admin"),
    });
    expect(adminList.status).toBe(200);
    const adminIds = ((await json(adminList)).data as Array<{ id: string }>).map((r) => r.id);
    expect(adminIds).toContain(DAY_OTHER_TEACHER);
    expect(adminIds).toContain(DAY_DRAFT);
  });
});

describe("diary — graph and validation", () => {
  it("rejects legacy IDs and subject rows without assignment/section", async () => {
    const app = appWithDb(baseDb());
    expect(
      (
        await app.request("/api/v1/diary", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({
            ...createBody,
            diary_date: "2026-08-28",
            rows: [
              {
                section_id: "asg-1",
                class_label: "10-A",
                description: "Legacy section",
              },
            ],
          }),
        })
      ).status,
    ).toBe(400);

    expect(
      (await app.request(`/api/v1/diary/diary-subject-2026-08-26`, { headers: auth("token-teacher") }))
        .status,
    ).toBe(400);

    expect(
      (
        await app.request("/api/v1/diary", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({
            ...createBody,
            diary_date: "2026-08-28",
            rows: [{ class_label: "10-A", description: "No section" }],
          }),
        })
      ).status,
    ).toBe(400);

    expect(
      (
        await app.request("/api/v1/diary", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({
            ...createBody,
            diary_date: "2026-08-28",
            rows: [
              {
                section_id: SECTION_C,
                class_label: "9-C",
                description: "Not assigned",
              },
            ],
          }),
        })
      ).status,
    ).toBe(403);
  });

  it("allows activity diary without section_id", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/diary", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({
        institute_id: INST_A,
        diary_date: "2026-08-28",
        scope: "activity",
        rows: [{ class_label: "U14 Football", description: "Scrimmage" }],
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.scope).toBe("activity");
    expect(body.data.rows[0].sectionId).toBeNull();
  });
});

describe("diary — lifecycle", () => {
  it("create, patch rows, submit, re-submit, duplicate 409", async () => {
    const app = appWithDb(baseDb());

    const created = await app.request("/api/v1/diary", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify(createBody),
    });
    expect(created.status).toBe(201);
    const id = (await json(created)).data.id as string;

    const patched = await app.request(`/api/v1/diary/${id}`, {
      method: "PATCH",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({
        rows: [
          {
            section_id: SECTION_A,
            class_label: "10-A",
            description: "Updated notes",
          },
        ],
      }),
    });
    expect(patched.status).toBe(200);
    expect((await json(patched)).data.rows[0].description).toBe("Updated notes");

    const submitted = await app.request(`/api/v1/diary/${id}/submit`, {
      method: "POST",
      headers: auth("token-teacher"),
    });
    expect(submitted.status).toBe(200);
    expect((await json(submitted)).data.submittedAt).toBeTruthy();

    const resubmit = await app.request(`/api/v1/diary/${id}/submit`, {
      method: "POST",
      headers: auth("token-teacher"),
    });
    expect(resubmit.status).toBe(200);

    const dup = await app.request("/api/v1/diary", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify(createBody),
    });
    expect(dup.status).toBe(409);

    expect(
      (
        await app.request(`/api/v1/diary/${DAY_DRAFT}/submit`, {
          method: "POST",
          headers: auth("token-teacher"),
        })
      ).status,
    ).toBe(200);
  });
});

describe("diary — soft delete", () => {
  it("hides deleted days and fails closed", async () => {
    const app = appWithDb(baseDb());
    expect(
      (
        await app.request(`/api/v1/diary/${DAY_DRAFT}`, {
          method: "DELETE",
          headers: auth("token-teacher"),
        })
      ).status,
    ).toBe(200);

    const list = await app.request(`/api/v1/diary?institute_id=${INST_A}`, {
      headers: auth("token-admin"),
    });
    const ids = ((await json(list)).data as Array<{ id: string }>).map((r) => r.id);
    expect(ids).not.toContain(DAY_DRAFT);
    expect(ids).not.toContain(DAY_DELETED);

    expect(
      (await app.request(`/api/v1/diary/${DAY_DRAFT}`, { headers: auth("token-admin") })).status,
    ).toBe(404);
    expect(
      (await app.request(`/api/v1/diary/${DAY_DELETED}`, { headers: auth("token-admin") })).status,
    ).toBe(404);
  });
});

describe("diary — client teacher_id spoofing", () => {
  it("ignores client teacher_id", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/diary", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({
        ...createBody,
        diary_date: "2026-08-29",
        teacher_id: TEACHER_B,
      }),
    });
    expect(res.status).toBe(201);
    expect((await json(res)).data.teacherId).toBe(TEACHER_A);
  });
});
