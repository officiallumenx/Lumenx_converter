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
const USER_STUDENT_B = "77777777-7777-4777-8777-777777777777";
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const USER_PARENT = "55555555-5555-4555-8555-555555555555";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_TEACHER2 = "aa666666-6666-4666-8666-666666666666";
const MEMBER_STUDENT = "aa333333-3333-4333-8333-333333333333";
const MEMBER_STUDENT_B = "aa777777-7777-4777-8777-777777777777";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const MEMBER_PARENT = "aa555555-5555-4555-8555-555555555555";
const TEACHER_A = "bb111111-1111-4111-8111-111111111111";
const TEACHER_B = "bb222222-2222-4222-8222-222222222222";
const PARENT_A = "ba111111-1111-4111-8111-111111111111";
const SECTION_A = "cc111111-1111-4111-8111-111111111111";
const SECTION_B = "cc222222-2222-4222-8222-222222222222";
const SUBJECT_A = "dd111111-1111-4111-8111-111111111111";
const SUBJECT_B = "dd222222-2222-4222-8222-222222222222";
const YEAR_A = "ee111111-1111-4111-8111-111111111111";
const YEAR_B = "ee222222-2222-4222-8222-222222222222";
const CLASS_A = "ff111111-1111-4111-8111-111111111111";
const CLASS_B = "ff222222-2222-4222-8222-222222222222";
const ASSIGN_A = "ab111111-1111-4111-8111-111111111111";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const STUDENT_B = "ac222222-2222-4222-8222-222222222222";
const ENROLL_A = "ad111111-1111-4111-8111-111111111111";
const ENROLL_B = "ad222222-2222-4222-8222-222222222222";
const EXAM_A = "ae111111-1111-4111-8111-111111111111";
const EXAM_B = "ae222222-2222-4222-8222-222222222222";
const EXAM_C = "ae333333-3333-4333-8333-333333333333";
const ENTRY_PENDING = "af111111-1111-4111-8111-111111111111";
const ENTRY_OTHER = "af222222-2222-4222-8222-222222222222";
const ENTRY_PUBLISHED = "af333333-3333-4333-8333-333333333333";
const SCORE_A = "b0111111-1111-4111-8111-111111111111";
const SCORE_B = "b0222222-2222-4222-8222-222222222222";

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
    { id: USER_STUDENT_B, display_name: "StudentB", email: "sb@x.com", status: "active", deleted_at: null },
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
    { id: USER_PARENT, display_name: "Parent", email: "p@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER2, user_id: USER_TEACHER2, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_STUDENT, user_id: USER_STUDENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_STUDENT_B, user_id: USER_STUDENT_B, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
    { id: MEMBER_PARENT, user_id: USER_PARENT, institute_id: INST_A, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_TEACHER2, role_code: "teacher" },
    { membership_id: MEMBER_STUDENT, role_code: "student" },
    { membership_id: MEMBER_STUDENT_B, role_code: "student" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
  ];
  db.teacher = [
    { id: TEACHER_A, institute_id: INST_A, user_profile_id: USER_TEACHER, status: "active", deleted_at: null },
    { id: TEACHER_B, institute_id: INST_A, user_profile_id: USER_TEACHER2, status: "active", deleted_at: null },
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
    { id: STUDENT_A, institute_id: INST_A, user_profile_id: USER_STUDENT, deleted_at: null },
    { id: STUDENT_B, institute_id: INST_A, user_profile_id: USER_STUDENT_B, deleted_at: null },
  ];
  db.academic_year = [
    { id: YEAR_A, institute_id: INST_A, deleted_at: null },
    { id: YEAR_B, institute_id: INST_B, deleted_at: null },
  ];
  db.subject = [
    { id: SUBJECT_A, institute_id: INST_A, deleted_at: null },
    { id: SUBJECT_B, institute_id: INST_B, deleted_at: null },
  ];
  db.section = [
    { id: SECTION_A, institute_id: INST_A, academic_year_id: YEAR_A, class_id: CLASS_A, deleted_at: null },
    { id: SECTION_B, institute_id: INST_B, academic_year_id: YEAR_B, class_id: CLASS_B, deleted_at: null },
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
    {
      id: ENROLL_B,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      student_id: STUDENT_B,
      class_id: CLASS_A,
      section_id: SECTION_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.exam = [
    {
      id: EXAM_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      name: "UT1",
      header: "UT1",
      start_date: "2026-09-01",
      end_date: "2026-09-05",
      default_starts_at: "09:00:00",
      default_ends_at: "12:00:00",
      total_marks: 50,
      internal_marks: null,
      external_marks: null,
      audience_scope: "year",
      schedule_status: "published",
      lifecycle_status: "open",
      schedule_published_at: "2026-08-01T00:00:00.000Z",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: EXAM_B,
      institute_id: INST_B,
      academic_year_id: YEAR_B,
      name: "Other",
      header: "Other",
      start_date: "2026-09-01",
      end_date: "2026-09-02",
      default_starts_at: "09:00:00",
      default_ends_at: "12:00:00",
      total_marks: 100,
      internal_marks: null,
      external_marks: null,
      audience_scope: "year",
      schedule_status: "published",
      lifecycle_status: "open",
      schedule_published_at: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: EXAM_C,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      name: "UT2",
      header: "UT2",
      start_date: "2026-10-01",
      end_date: "2026-10-05",
      default_starts_at: "09:00:00",
      default_ends_at: "12:00:00",
      total_marks: 50,
      internal_marks: null,
      external_marks: null,
      audience_scope: "year",
      schedule_status: "published",
      lifecycle_status: "open",
      schedule_published_at: "2026-09-01T00:00:00.000Z",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.mark_entry = [
    {
      id: ENTRY_PENDING,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      section_id: SECTION_A,
      exam_id: EXAM_A,
      subject_id: SUBJECT_A,
      teacher_id: TEACHER_A,
      max_marks: 50,
      status: "pending",
      submitted_at: null,
      published_at: null,
      admin_note: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ENTRY_PUBLISHED,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      section_id: SECTION_A,
      exam_id: EXAM_A,
      subject_id: SUBJECT_A,
      teacher_id: TEACHER_B,
      max_marks: 50,
      status: "published",
      submitted_at: "2026-08-02T00:00:00.000Z",
      published_at: "2026-08-03T00:00:00.000Z",
      admin_note: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ENTRY_OTHER,
      institute_id: INST_B,
      academic_year_id: YEAR_B,
      class_id: CLASS_B,
      section_id: SECTION_B,
      exam_id: EXAM_B,
      subject_id: SUBJECT_B,
      teacher_id: TEACHER_A,
      max_marks: 100,
      status: "pending",
      submitted_at: null,
      published_at: null,
      admin_note: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.mark_score = [
    {
      id: SCORE_A,
      institute_id: INST_A,
      mark_entry_id: ENTRY_PUBLISHED,
      student_id: STUDENT_A,
      enrollment_id: ENROLL_A,
      marks: 40,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: SCORE_B,
      institute_id: INST_A,
      mark_entry_id: ENTRY_PUBLISHED,
      student_id: STUDENT_B,
      enrollment_id: ENROLL_B,
      marks: 35,
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
        "token-teacher2": USER_TEACHER2,
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
  academic_year_id: YEAR_A,
  class_id: CLASS_A,
  section_id: SECTION_A,
  exam_id: EXAM_A,
  subject_id: SUBJECT_A,
  teacher_id: TEACHER_A,
  max_marks: 50,
  scores: [
    { enrollment_id: ENROLL_A, marks: 40 },
    { enrollment_id: ENROLL_B, marks: null },
  ],
};

describe("marks — authentication", () => {
  it("returns 401 without JWT", async () => {
    const app = appWithDb(baseDb());
    expect((await app.request(`/api/v1/marks/entries?institute_id=${INST_A}`)).status).toBe(401);
  });

  it("returns 401 for invalid JWT", async () => {
    const app = appWithDb(baseDb());
    expect(
      (await app.request(`/api/v1/marks/entries?institute_id=${INST_A}`, { headers: auth("bad") }))
        .status,
    ).toBe(401);
  });
});

describe("marks — tenant isolation", () => {
  it("blocks cross-institute list/get/create/patch/workflow/delete", async () => {
    const app = appWithDb(baseDb());
    expect(
      (await app.request(`/api/v1/marks/entries?institute_id=${INST_B}`, { headers: auth("token-admin") }))
        .status,
    ).toBe(403);

    expect(
      (await app.request(`/api/v1/marks/entries/${ENTRY_OTHER}`, { headers: auth("token-admin") })).status,
    ).toBe(403);

    expect(
      (
        await app.request("/api/v1/marks/entries", {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({ ...createBody, institute_id: INST_B, academic_year_id: YEAR_B }),
        })
      ).status,
    ).toBe(403);

    for (const path of [
      `/api/v1/marks/entries/${ENTRY_OTHER}`,
      `/api/v1/marks/entries/${ENTRY_OTHER}/submit`,
      `/api/v1/marks/entries/${ENTRY_OTHER}/publish`,
      `/api/v1/marks/entries/${ENTRY_OTHER}/return`,
      `/api/v1/marks/entries/${ENTRY_OTHER}/reject`,
    ]) {
      const method = path.endsWith(ENTRY_OTHER) ? "PATCH" : "POST";
      expect(
        (
          await app.request(path, {
            method,
            headers: jsonHeaders("token-admin"),
            body: JSON.stringify(method === "PATCH" ? { max_marks: 40 } : {}),
          })
        ).status,
      ).toBe(403);
    }

    expect(
      (
        await app.request(`/api/v1/marks/entries/${ENTRY_OTHER}`, {
          method: "DELETE",
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(403);
  });
});

describe("marks — RBAC", () => {
  it("allows staff create and teacher create with assignment", async () => {
    const app = appWithDb(baseDb());
    const staff = await app.request("/api/v1/marks/entries", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        ...createBody,
        exam_id: EXAM_C,
        teacher_id: TEACHER_B,
        scores: [{ enrollment_id: ENROLL_A, marks: 10 }],
      }),
    });
    expect(staff.status).toBe(201);
    const staffBody = await json(staff);
    expect(staffBody.data.status).toBe("pending");
    expect(staffBody.data.teacherId).toBe(TEACHER_B);

    const teacher = await app.request("/api/v1/marks/entries", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        exam_id: EXAM_C,
        subject_id: SUBJECT_A,
        max_marks: 50,
        scores: [{ enrollment_id: ENROLL_A, marks: 12 }],
      }),
    });
    expect(teacher.status).toBe(201);
    expect((await json(teacher)).data.teacherId).toBe(TEACHER_A);
  });

  it("forbids teacher without assignment", async () => {
    const db = baseDb();
    db.teacher_assignment = [];
    const app = appWithDb(db);
    const res = await app.request("/api/v1/marks/entries", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        exam_id: EXAM_A,
        subject_id: SUBJECT_A,
        max_marks: 50,
      }),
    });
    expect(res.status).toBe(403);
  });

  it("allows teacher to patch/submit own entry; blocks publish/return/reject", async () => {
    const app = appWithDb(baseDb());
    const patch = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}`, {
      method: "PATCH",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({
        scores: [
          { enrollment_id: ENROLL_A, marks: 41 },
          { enrollment_id: ENROLL_B, marks: 30 },
        ],
      }),
    });
    expect(patch.status).toBe(200);

    const submit = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}/submit`, {
      method: "POST",
      headers: auth("token-teacher"),
    });
    expect(submit.status).toBe(200);
    expect((await json(submit)).data.status).toBe("submitted");

    expect(
      (
        await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}/publish`, {
          method: "POST",
          headers: auth("token-teacher"),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}/return`, {
          method: "POST",
          headers: auth("token-teacher"),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}/reject`, {
          method: "POST",
          headers: auth("token-teacher"),
        })
      ).status,
    ).toBe(403);
  });

  it("forbids teacher patching another teacher's entry", async () => {
    const app = appWithDb(baseDb());
    // ENTRY_PUBLISHED owned by TEACHER_B — even if editable, teacher A blocked; make a pending for B
    const db = baseDb();
    db.mark_entry[1]!.status = "pending";
    db.mark_entry[1]!.published_at = null;
    db.mark_entry[1]!.submitted_at = null;
    const app2 = appWithDb(db);
    const res = await app2.request(`/api/v1/marks/entries/${ENTRY_PUBLISHED}`, {
      method: "PATCH",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({ scores: [{ enrollment_id: ENROLL_A, marks: 1 }] }),
    });
    expect(res.status).toBe(403);
    void app;
  });

  it("forbids learner and parent writes", async () => {
    const app = appWithDb(baseDb());
    for (const token of ["token-student", "token-parent"] as const) {
      expect(
        (
          await app.request("/api/v1/marks/entries", {
            method: "POST",
            headers: jsonHeaders(token),
            body: JSON.stringify(createBody),
          })
        ).status,
      ).toBe(403);
    }
  });
});

describe("marks — integrity", () => {
  it("rejects cross-institute exam and marks > max_marks", async () => {
    const app = appWithDb(baseDb());
    const crossExam = await app.request("/api/v1/marks/entries", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ ...createBody, exam_id: EXAM_B }),
    });
    expect(crossExam.status).toBe(400);

    const over = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}`, {
      method: "PATCH",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        scores: [{ enrollment_id: ENROLL_A, marks: 999 }],
      }),
    });
    expect(over.status).toBe(400);
  });

  it("allows null marks and rejects negative via validation", async () => {
    const app = appWithDb(baseDb());
    const ok = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}`, {
      method: "PATCH",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        scores: [{ enrollment_id: ENROLL_A, marks: null }],
      }),
    });
    expect(ok.status).toBe(200);

    const neg = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}`, {
      method: "PATCH",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        scores: [{ enrollment_id: ENROLL_A, marks: -1 }],
      }),
    });
    expect(neg.status).toBe(400);
  });
});

describe("marks — workflow", () => {
  it("runs pending → submit → publish and locks edits", async () => {
    const app = appWithDb(baseDb());
    const submit = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}/submit`, {
      method: "POST",
      headers: auth("token-admin"),
    });
    expect(submit.status).toBe(200);

    const again = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}/submit`, {
      method: "POST",
      headers: auth("token-admin"),
    });
    expect(again.status).toBe(409);

    const publish = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}/publish`, {
      method: "POST",
      headers: auth("token-admin"),
    });
    expect(publish.status).toBe(200);
    expect((await json(publish)).data.status).toBe("published");

    const republish = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}/publish`, {
      method: "POST",
      headers: auth("token-admin"),
    });
    expect(republish.status).toBe(409);

    const patch = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}`, {
      method: "PATCH",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ max_marks: 40 }),
    });
    expect(patch.status).toBe(409);
  });

  it("supports return and reject then re-submit", async () => {
    const db = baseDb();
    db.mark_entry[0]!.status = "submitted";
    db.mark_entry[0]!.submitted_at = "2026-08-02T00:00:00.000Z";
    const app = appWithDb(db);

    const ret = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}/return`, {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ admin_note: "fix" }),
    });
    expect(ret.status).toBe(200);
    expect((await json(ret)).data.status).toBe("returned");

    const patch = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}`, {
      method: "PATCH",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({
        scores: [{ enrollment_id: ENROLL_A, marks: 45 }],
      }),
    });
    expect(patch.status).toBe(200);

    const submit = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}/submit`, {
      method: "POST",
      headers: auth("token-teacher"),
    });
    expect(submit.status).toBe(200);

    const rej = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}/reject`, {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ admin_note: "no" }),
    });
    expect(rej.status).toBe(200);
    expect((await json(rej)).data.status).toBe("rejected");
  });

  it("soft-deletes and blocks further ops", async () => {
    const app = appWithDb(baseDb());
    expect(
      (
        await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}`, {
          method: "DELETE",
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(200);
    expect(
      (await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}`, { headers: auth("token-admin") }))
        .status,
    ).toBe(404);
    expect(
      (
        await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}`, {
          method: "PATCH",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({ max_marks: 40 }),
        })
      ).status,
    ).toBe(404);
  });
});

describe("marks — privacy", () => {
  it("filters peer scores for learners and parents; staff see all", async () => {
    const app = appWithDb(baseDb());

    const staff = await app.request(`/api/v1/marks/entries/${ENTRY_PUBLISHED}`, {
      headers: auth("token-admin"),
    });
    expect(staff.status).toBe(200);
    expect((await json(staff)).data.scores).toHaveLength(2);

    const learnerA = await app.request(`/api/v1/marks/entries/${ENTRY_PUBLISHED}`, {
      headers: auth("token-student"),
    });
    expect(learnerA.status).toBe(200);
    const scoresA = (await json(learnerA)).data.scores as Array<{ studentId: string }>;
    expect(scoresA).toHaveLength(1);
    expect(scoresA[0]!.studentId).toBe(STUDENT_A);
    expect(scoresA.some((s) => s.studentId === STUDENT_B)).toBe(false);

    const learnerB = await app.request(`/api/v1/marks/entries/${ENTRY_PUBLISHED}`, {
      headers: auth("token-student-b"),
    });
    expect(learnerB.status).toBe(200);
    const scoresB = (await json(learnerB)).data.scores as Array<{ studentId: string }>;
    expect(scoresB).toHaveLength(1);
    expect(scoresB[0]!.studentId).toBe(STUDENT_B);

    const parent = await app.request(`/api/v1/marks/entries/${ENTRY_PUBLISHED}`, {
      headers: auth("token-parent"),
    });
    expect(parent.status).toBe(200);
    const parentScores = (await json(parent)).data.scores as Array<{ studentId: string }>;
    expect(parentScores).toHaveLength(1);
    expect(parentScores[0]!.studentId).toBe(STUDENT_A);

    const draft = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}`, {
      headers: auth("token-student"),
    });
    expect(draft.status).toBe(403);
  });
});

describe("marks — legacy IDs", () => {
  it("rejects EX-*, ex-*, ST-* path and query values", async () => {
    const app = appWithDb(baseDb());
    expect(
      (await app.request("/api/v1/marks/entries/EX-UT1", { headers: auth("token-admin") })).status,
    ).toBe(400);
    expect(
      (await app.request("/api/v1/marks/entries/ex-ut1", { headers: auth("token-admin") })).status,
    ).toBe(400);
    expect(
      (
        await app.request(`/api/v1/marks/entries?institute_id=${INST_A}&exam_id=EX-UT1`, {
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await app.request("/api/v1/marks/entries", {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({ ...createBody, teacher_id: "T-M1" }),
        })
      ).status,
    ).toBe(400);
  });
});
