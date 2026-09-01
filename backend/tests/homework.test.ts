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
const SECTION_C = "cc333333-3333-4333-8333-333333333333";
const SUBJECT_A = "dd111111-1111-4111-8111-111111111111";
const SUBJECT_B = "dd222222-2222-4222-8222-222222222222";
const YEAR_A = "ee111111-1111-4111-8111-111111111111";
const YEAR_B = "ee222222-2222-4222-8222-222222222222";
const CLASS_A = "ff111111-1111-4111-8111-111111111111";
const CLASS_B = "ff222222-2222-4222-8222-222222222222";
const CLASS_C = "ff333333-3333-4333-8333-333333333333";
const ASSIGN_A = "ab111111-1111-4111-8111-111111111111";
const ASSIGN_B = "ab222222-2222-4222-8222-222222222222";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const STUDENT_B = "ac222222-2222-4222-8222-222222222222";
const ENROLL_A = "ad111111-1111-4111-8111-111111111111";
const ENROLL_B = "ad222222-2222-4222-8222-222222222222";
const HW_DRAFT = "af111111-1111-4111-8111-111111111111";
const HW_PUBLISHED = "af222222-2222-4222-8222-222222222222";
const HW_EXPIRED = "af333333-3333-4333-8333-333333333333";
const HW_OTHER_INST = "af444444-4444-4444-8444-444444444444";
const HW_DRAFT_B = "af555555-5555-4555-8555-555555555555";
const HW_PUB_OTHER_SECTION = "af666666-6666-4666-8666-666666666666";
const HW_DELETED = "af777777-7777-4777-8777-777777777777";
const SUBMISSION_A = "b0111111-1111-4111-8111-111111111111";

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
    { id: TEACHER_A, institute_id: INST_A, user_profile_id: USER_TEACHER, display_name: "Teacher A", status: "active", deleted_at: null },
    { id: TEACHER_B, institute_id: INST_A, user_profile_id: USER_TEACHER2, display_name: "Teacher B", status: "active", deleted_at: null },
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
    { id: STUDENT_A, institute_id: INST_A, user_profile_id: USER_STUDENT, display_name: "Student A", deleted_at: null },
    { id: STUDENT_B, institute_id: INST_A, user_profile_id: USER_STUDENT_B, display_name: "Student B", deleted_at: null },
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
  db.enrollment = [
    {
      id: ENROLL_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      student_id: STUDENT_A,
      class_id: CLASS_A,
      section_id: SECTION_A,
      roll_no: "12",
      status: "active",
      deleted_at: null,
    },
    {
      id: ENROLL_B,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      student_id: STUDENT_B,
      class_id: CLASS_C,
      section_id: SECTION_C,
      status: "active",
      deleted_at: null,
    },
  ];
  db.homework = [
    {
      id: HW_DRAFT,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      section_id: SECTION_A,
      subject_id: SUBJECT_A,
      teacher_id: TEACHER_A,
      kind: "homework",
      title: "Draft HW",
      description: "Draft desc",
      instructions: null,
      due_date: "2026-09-10",
      status: "draft",
      published_at: null,
      attachment_asset_id: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: HW_PUBLISHED,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      section_id: SECTION_A,
      subject_id: SUBJECT_A,
      teacher_id: TEACHER_A,
      kind: "homework",
      title: "Published HW",
      description: "Published desc",
      instructions: "Show work",
      due_date: "2026-09-15",
      status: "published",
      published_at: "2026-08-05T00:00:00.000Z",
      attachment_asset_id: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-05T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: HW_EXPIRED,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      section_id: SECTION_A,
      subject_id: SUBJECT_A,
      teacher_id: TEACHER_A,
      kind: "assignment",
      title: "Expired HW",
      description: "Expired desc",
      instructions: null,
      due_date: "2026-08-01",
      status: "expired",
      published_at: "2026-07-01T00:00:00.000Z",
      attachment_asset_id: null,
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-08-02T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: HW_DRAFT_B,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_C,
      section_id: SECTION_C,
      subject_id: SUBJECT_A,
      teacher_id: TEACHER_B,
      kind: "homework",
      title: "Teacher B Draft",
      description: "Secret draft",
      instructions: null,
      due_date: "2026-09-20",
      status: "draft",
      published_at: null,
      attachment_asset_id: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: HW_PUB_OTHER_SECTION,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_C,
      section_id: SECTION_C,
      subject_id: SUBJECT_A,
      teacher_id: TEACHER_B,
      kind: "homework",
      title: "Section C Published",
      description: "Other section",
      instructions: null,
      due_date: "2026-09-25",
      status: "published",
      published_at: "2026-08-06T00:00:00.000Z",
      attachment_asset_id: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-06T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: HW_OTHER_INST,
      institute_id: INST_B,
      academic_year_id: YEAR_B,
      class_id: CLASS_B,
      section_id: SECTION_B,
      subject_id: SUBJECT_B,
      teacher_id: TEACHER_A,
      kind: "homework",
      title: "Other institute",
      description: "B",
      instructions: null,
      due_date: "2026-09-10",
      status: "published",
      published_at: "2026-08-01T00:00:00.000Z",
      attachment_asset_id: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: HW_DELETED,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      section_id: SECTION_A,
      subject_id: SUBJECT_A,
      teacher_id: TEACHER_A,
      kind: "homework",
      title: "Deleted",
      description: "Gone",
      instructions: null,
      due_date: "2026-09-01",
      status: "draft",
      published_at: null,
      attachment_asset_id: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: "2026-08-10T00:00:00.000Z",
    },
  ];
  db.homework_submission = [
    {
      id: SUBMISSION_A,
      institute_id: INST_A,
      homework_id: HW_PUBLISHED,
      student_id: STUDENT_A,
      enrollment_id: ENROLL_A,
      status: "missing",
      marked_at: null,
      marked_by_user_id: null,
      created_at: "2026-08-05T00:00:00.000Z",
      updated_at: "2026-08-05T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  return db;
}

function appWithDb(db: MockDb, nextErrors?: Array<{ code: string; message?: string } | null>) {
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
      nextErrors,
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
  subject_id: SUBJECT_A,
  teacher_id: TEACHER_A,
  kind: "homework",
  title: "New homework",
  description: "Do the worksheet",
  instructions: "Neat handwriting",
  due_date: "2026-09-30",
};

describe("homework — authentication", () => {
  it("returns 401 without JWT", async () => {
    const app = appWithDb(baseDb());
    expect((await app.request(`/api/v1/homework?institute_id=${INST_A}`)).status).toBe(401);
  });

  it("returns 401 for invalid JWT", async () => {
    const app = appWithDb(baseDb());
    expect(
      (await app.request(`/api/v1/homework?institute_id=${INST_A}`, { headers: auth("bad") })).status,
    ).toBe(401);
  });
});

describe("homework — tenant isolation", () => {
  it("blocks cross-institute list/get/create/patch/publish/expire/delete", async () => {
    const app = appWithDb(baseDb());

    expect(
      (await app.request(`/api/v1/homework?institute_id=${INST_B}`, { headers: auth("token-admin") }))
        .status,
    ).toBe(403);

    expect(
      (await app.request(`/api/v1/homework/${HW_OTHER_INST}`, { headers: auth("token-admin") })).status,
    ).toBe(403);

    expect(
      (
        await app.request("/api/v1/homework", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({
            ...createBody,
            institute_id: INST_B,
            academic_year_id: YEAR_B,
            class_id: CLASS_B,
            section_id: SECTION_B,
            subject_id: SUBJECT_B,
          }),
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await app.request(`/api/v1/homework/${HW_OTHER_INST}`, {
          method: "PATCH",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({ title: "x" }),
        })
      ).status,
    ).toBe(403);

    for (const suffix of ["publish", "expire"]) {
      expect(
        (
          await app.request(`/api/v1/homework/${HW_OTHER_INST}/${suffix}`, {
            method: "POST",
            headers: auth("token-admin"),
          })
        ).status,
      ).toBe(403);
    }

    expect(
      (
        await app.request(`/api/v1/homework/${HW_OTHER_INST}`, {
          method: "DELETE",
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(403);
  });
});

describe("homework — RBAC", () => {
  it("allows teacher create with assignment and rejects without assignment", async () => {
    const app = appWithDb(baseDb());
    const ok = await app.request("/api/v1/homework", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify(createBody),
    });
    expect(ok.status).toBe(201);
    const body = await json(ok);
    expect(body.data.status).toBe("draft");
    expect(body.data.publishedAt).toBeNull();
    expect(body.data.teacherId).toBe(TEACHER_A);

    const noAssign = await app.request("/api/v1/homework", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({
        ...createBody,
        class_id: CLASS_C,
        section_id: SECTION_C,
      }),
    });
    expect(noAssign.status).toBe(403);
  });

  it("rejects learner/parent mutations and staff content create/patch/publish", async () => {
    const app = appWithDb(baseDb());

    for (const token of ["token-student", "token-parent"]) {
      expect(
        (
          await app.request("/api/v1/homework", {
            method: "POST",
            headers: jsonHeaders(token),
            body: JSON.stringify(createBody),
          })
        ).status,
      ).toBe(403);

      expect(
        (
          await app.request(`/api/v1/homework/${HW_DRAFT}`, {
            method: "PATCH",
            headers: jsonHeaders(token),
            body: JSON.stringify({ title: "Nope" }),
          })
        ).status,
      ).toBe(403);

      for (const suffix of ["publish", "expire"]) {
        expect(
          (
            await app.request(`/api/v1/homework/${HW_DRAFT}/${suffix}`, {
              method: "POST",
              headers: auth(token),
            })
          ).status,
        ).toBe(403);
      }

      expect(
        (
          await app.request(`/api/v1/homework/${HW_DRAFT}`, {
            method: "DELETE",
            headers: auth(token),
          })
        ).status,
      ).toBe(403);
    }

    expect(
      (
        await app.request("/api/v1/homework", {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify(createBody),
        })
      ).status,
    ).toBe(201);

    expect(
      (
        await app.request("/api/v1/homework", {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({ ...createBody, teacher_id: undefined }),
        })
      ).status,
    ).toBe(400);

    expect(
      (
        await app.request(`/api/v1/homework/${HW_DRAFT}`, {
          method: "PATCH",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({ title: "Admin edit" }),
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await app.request(`/api/v1/homework/${HW_DRAFT}/publish`, {
          method: "POST",
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(403);
  });

  it("allows staff governance expire and soft-delete", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const expire = await app.request(`/api/v1/homework/${HW_PUBLISHED}/expire`, {
      method: "POST",
      headers: auth("token-admin"),
    });
    expect(expire.status).toBe(200);
    expect((await json(expire)).data.status).toBe("expired");

    const del = await app.request(`/api/v1/homework/${HW_DRAFT}`, {
      method: "DELETE",
      headers: auth("token-admin"),
    });
    expect(del.status).toBe(200);
    expect((await json(del)).data.ok).toBe(true);
  });
});

describe("homework — ownership", () => {
  it("blocks teacher A from mutating teacher B homework", async () => {
    const app = appWithDb(baseDb());

    expect(
      (
        await app.request(`/api/v1/homework/${HW_DRAFT_B}`, {
          method: "PATCH",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({ title: "steal" }),
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await app.request(`/api/v1/homework/${HW_DRAFT_B}/publish`, {
          method: "POST",
          headers: auth("token-teacher"),
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await app.request(`/api/v1/homework/${HW_PUB_OTHER_SECTION}/expire`, {
          method: "POST",
          headers: auth("token-teacher"),
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await app.request(`/api/v1/homework/${HW_DRAFT_B}`, {
          method: "DELETE",
          headers: auth("token-teacher"),
        })
      ).status,
    ).toBe(403);
  });
});

describe("homework — graph integrity", () => {
  it("rejects invalid UUID and legacy IDs", async () => {
    const app = appWithDb(baseDb());

    expect(
      (
        await app.request("/api/v1/homework", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({ ...createBody, section_id: "asg-1" }),
        })
      ).status,
    ).toBe(400);

    expect(
      (
        await app.request("/api/v1/homework", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({ ...createBody, teacher_id: "T-1042" }),
        })
      ).status,
    ).toBe(400);

    expect(
      (await app.request(`/api/v1/homework/EX-1001`, { headers: auth("token-teacher") })).status,
    ).toBe(400);

    expect(
      (
        await app.request(`/api/v1/homework?institute_id=${INST_A}&teacher_id=t-mehta`, {
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(400);
  });

  it("rejects cross-institute section/subject and year/class/section mismatch", async () => {
    const app = appWithDb(baseDb());

    expect(
      (
        await app.request("/api/v1/homework", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({ ...createBody, section_id: SECTION_B }),
        })
      ).status,
    ).toBe(400);

    expect(
      (
        await app.request("/api/v1/homework", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({ ...createBody, subject_id: SUBJECT_B }),
        })
      ).status,
    ).toBe(400);

    expect(
      (
        await app.request("/api/v1/homework", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({ ...createBody, class_id: CLASS_C }),
        })
      ).status,
    ).toBe(400);
  });
});

describe("homework — lifecycle", () => {
  it("create draft, patch, publish, expire with immutability and 409 races", async () => {
    const app = appWithDb(baseDb());

    const created = await app.request("/api/v1/homework", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify(createBody),
    });
    expect(created.status).toBe(201);
    const createdBody = await json(created);
    const id = createdBody.data.id as string;
    expect(createdBody.data.status).toBe("draft");

    const patched = await app.request(`/api/v1/homework/${id}`, {
      method: "PATCH",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({ title: "Updated title", kind: "assignment" }),
    });
    expect(patched.status).toBe(200);
    const patchedBody = await json(patched);
    expect(patchedBody.data.title).toBe("Updated title");
    expect(patchedBody.data.kind).toBe("assignment");

    const published = await app.request(`/api/v1/homework/${id}/publish`, {
      method: "POST",
      headers: auth("token-teacher"),
    });
    expect(published.status).toBe(200);
    const pubBody = await json(published);
    expect(pubBody.data.status).toBe("published");
    expect(pubBody.data.publishedAt).toBeTruthy();

    expect(
      (
        await app.request(`/api/v1/homework/${id}`, {
          method: "PATCH",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({ title: "nope" }),
        })
      ).status,
    ).toBe(409);

    const republish = await app.request(`/api/v1/homework/${id}/publish`, {
      method: "POST",
      headers: auth("token-teacher"),
    });
    expect(republish.status).toBe(409);

    expect(
      (
        await app.request(`/api/v1/homework/${HW_DRAFT}/expire`, {
          method: "POST",
          headers: auth("token-teacher"),
        })
      ).status,
    ).toBe(409);

    const expired = await app.request(`/api/v1/homework/${id}/expire`, {
      method: "POST",
      headers: auth("token-teacher"),
    });
    expect(expired.status).toBe(200);
    expect((await json(expired)).data.status).toBe("expired");

    expect(
      (
        await app.request(`/api/v1/homework/${id}/expire`, {
          method: "POST",
          headers: auth("token-teacher"),
        })
      ).status,
    ).toBe(409);

    expect(
      (
        await app.request(`/api/v1/homework/${id}`, {
          method: "PATCH",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({ title: "still nope" }),
        })
      ).status,
    ).toBe(409);

    expect(
      (
        await app.request(`/api/v1/homework/${id}/publish`, {
          method: "POST",
          headers: auth("token-teacher"),
        })
      ).status,
    ).toBe(409);
  });
});

describe("homework — privacy", () => {
  it("filters learner/parent/teacher draft visibility correctly", async () => {
    const app = appWithDb(baseDb());

    const studentList = await app.request(`/api/v1/homework?institute_id=${INST_A}`, {
      headers: auth("token-student"),
    });
    expect(studentList.status).toBe(200);
    const studentIds = ((await json(studentList)).data as Array<{ id: string; status: string }>).map(
      (r) => r.id,
    );
    expect(studentIds).toContain(HW_PUBLISHED);
    expect(studentIds).not.toContain(HW_DRAFT);
    expect(studentIds).not.toContain(HW_EXPIRED);
    expect(studentIds).not.toContain(HW_PUB_OTHER_SECTION);
    expect(studentIds).not.toContain(HW_DRAFT_B);

    expect(
      (await app.request(`/api/v1/homework/${HW_DRAFT}`, { headers: auth("token-student") })).status,
    ).toBe(403);
    expect(
      (await app.request(`/api/v1/homework/${HW_EXPIRED}`, { headers: auth("token-student") })).status,
    ).toBe(403);
    expect(
      (
        await app.request(`/api/v1/homework/${HW_PUB_OTHER_SECTION}`, {
          headers: auth("token-student"),
        })
      ).status,
    ).toBe(403);
    expect(
      (await app.request(`/api/v1/homework/${HW_PUBLISHED}`, { headers: auth("token-student") }))
        .status,
    ).toBe(200);

    const parentList = await app.request(`/api/v1/homework?institute_id=${INST_A}`, {
      headers: auth("token-parent"),
    });
    expect(parentList.status).toBe(200);
    const parentIds = ((await json(parentList)).data as Array<{ id: string }>).map((r) => r.id);
    expect(parentIds).toContain(HW_PUBLISHED);
    expect(parentIds).not.toContain(HW_PUB_OTHER_SECTION);
    expect(parentIds).not.toContain(HW_DRAFT);

    expect(
      (
        await app.request(`/api/v1/homework/${HW_PUB_OTHER_SECTION}`, {
          headers: auth("token-parent"),
        })
      ).status,
    ).toBe(403);

    const teacherList = await app.request(`/api/v1/homework?institute_id=${INST_A}`, {
      headers: auth("token-teacher"),
    });
    expect(teacherList.status).toBe(200);
    const teacherIds = ((await json(teacherList)).data as Array<{ id: string }>).map((r) => r.id);
    expect(teacherIds).toContain(HW_DRAFT);
    expect(teacherIds).toContain(HW_PUBLISHED);
    expect(teacherIds).not.toContain(HW_DRAFT_B);

    expect(
      (await app.request(`/api/v1/homework/${HW_DRAFT_B}`, { headers: auth("token-teacher") }))
        .status,
    ).toBe(403);

    const adminList = await app.request(`/api/v1/homework?institute_id=${INST_A}`, {
      headers: auth("token-admin"),
    });
    expect(adminList.status).toBe(200);
    const adminIds = ((await json(adminList)).data as Array<{ id: string }>).map((r) => r.id);
    expect(adminIds).toContain(HW_DRAFT);
    expect(adminIds).toContain(HW_DRAFT_B);
    expect(adminIds).toContain(HW_EXPIRED);
  });

  it("student B only sees section C published homework", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/homework?institute_id=${INST_A}`, {
      headers: auth("token-student-b"),
    });
    expect(res.status).toBe(200);
    const ids = ((await json(res)).data as Array<{ id: string }>).map((r) => r.id);
    expect(ids).toContain(HW_PUB_OTHER_SECTION);
    expect(ids).not.toContain(HW_PUBLISHED);
  });
});

describe("homework — soft delete", () => {
  it("hides deleted items and fails closed on mutations", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const del = await app.request(`/api/v1/homework/${HW_DRAFT}`, {
      method: "DELETE",
      headers: auth("token-teacher"),
    });
    expect(del.status).toBe(200);

    const list = await app.request(`/api/v1/homework?institute_id=${INST_A}`, {
      headers: auth("token-admin"),
    });
    const ids = ((await json(list)).data as Array<{ id: string }>).map((r) => r.id);
    expect(ids).not.toContain(HW_DRAFT);
    expect(ids).not.toContain(HW_DELETED);

    expect(
      (await app.request(`/api/v1/homework/${HW_DRAFT}`, { headers: auth("token-admin") })).status,
    ).toBe(404);
    expect(
      (await app.request(`/api/v1/homework/${HW_DELETED}`, { headers: auth("token-admin") })).status,
    ).toBe(404);

    expect(
      (
        await app.request(`/api/v1/homework/${HW_DELETED}`, {
          method: "PATCH",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({ title: "x" }),
        })
      ).status,
    ).toBe(404);

    expect(
      (
        await app.request(`/api/v1/homework/${HW_DELETED}/publish`, {
          method: "POST",
          headers: auth("token-teacher"),
        })
      ).status,
    ).toBe(404);
  });
});

describe("homework — error mapping", () => {
  it("maps FK errors via established envelope and conditional race to 409", async () => {
    const db = baseDb();
    const app = appWithDb(db, [
      { code: "23503", message: "foreign key violation" },
    ]);

    const create = await app.request("/api/v1/homework", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify(createBody),
    });
    expect(create.status).toBe(400);
    const err = await json(create);
    expect(err.error?.code).toBeDefined();

    const app2 = appWithDb(baseDb());
    const first = await app2.request(`/api/v1/homework/${HW_DRAFT}/publish`, {
      method: "POST",
      headers: auth("token-teacher"),
    });
    expect(first.status).toBe(200);
    const second = await app2.request(`/api/v1/homework/${HW_DRAFT}/publish`, {
      method: "POST",
      headers: auth("token-teacher"),
    });
    expect(second.status).toBe(409);
    expect((await json(second)).error.code).toBe("CONFLICT");
  });
});

describe("homework — staff create", () => {
  it("allows institute admin to create homework for an assigned teacher", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/homework", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify(createBody),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.teacherId).toBe(TEACHER_A);
    expect(body.data.title).toBe("New homework");
  });
});

describe("homework — client teacher_id spoofing", () => {
  it("ignores client teacher_id and uses JWT identity", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/homework", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({ ...createBody, teacher_id: TEACHER_B }),
    });
    expect(res.status).toBe(201);
    expect((await json(res)).data.teacherId).toBe(TEACHER_A);
  });
});

describe("homework — portal", () => {
  it("returns learner items for student and parent; teacher submission sheet + toggle", async () => {
    const app = appWithDb(baseDb());

    const studentRes = await app.request(
      `/api/v1/homework/portal/students/${STUDENT_A}/items?institute_id=${INST_A}`,
      { headers: auth("token-student") },
    );
    expect(studentRes.status).toBe(200);
    const items = (await json(studentRes)).data as Array<{ title: string }>;
    expect(items.some((i) => i.title === "Published HW")).toBe(true);

    const parentRes = await app.request(
      `/api/v1/homework/portal/students/${STUDENT_A}/items?institute_id=${INST_A}`,
      { headers: auth("token-parent") },
    );
    expect(parentRes.status).toBe(200);

    const sheetRes = await app.request(
      `/api/v1/homework/portal/teacher/${HW_PUBLISHED}/sheet?institute_id=${INST_A}`,
      { headers: auth("token-teacher") },
    );
    expect(sheetRes.status).toBe(200);
    const sheet = (await json(sheetRes)).data as { rows: Array<{ id: string; status: string }> };
    expect(sheet.rows.length).toBeGreaterThan(0);

    const toggleRes = await app.request(`/api/v1/homework/submissions/${SUBMISSION_A}`, {
      method: "PATCH",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({ status: "submitted" }),
    });
    expect(toggleRes.status).toBe(200);
    expect((await json(toggleRes)).data.status).toBe("submitted");
  });
});
