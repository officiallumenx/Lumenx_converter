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
const USER_PARENT = "55555555-5555-4555-8555-555555555555";
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_TEACHER2 = "aa666666-6666-4666-8666-666666666666";
const MEMBER_PARENT = "aa555555-5555-4555-8555-555555555555";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const TEACHER_A = "bb111111-1111-4111-8111-111111111111";
const TEACHER_B = "bb222222-2222-4222-8222-222222222222";
const PARENT_A = "ba111111-1111-4111-8111-111111111111";
const SECTION_A = "cc111111-1111-4111-8111-111111111111";
const SECTION_B = "cc222222-2222-4222-8222-222222222222";
const YEAR_A = "ee111111-1111-4111-8111-111111111111";
const CLASS_A = "ff111111-1111-4111-8111-111111111111";
const CLASS_B = "ff222222-2222-4222-8222-222222222222";
const ASSIGN_A = "ab111111-1111-4111-8111-111111111111";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const STUDENT_B = "ac222222-2222-4222-8222-222222222222";
const ENROLL_A = "ad111111-1111-4111-8111-111111111111";
const ENROLL_B = "ad222222-2222-4222-8222-222222222222";

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function json(res: Response): Promise<{ data?: unknown; error?: unknown }> {
  return res.json() as Promise<{ data?: unknown; error?: unknown }>;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.user_profile = [
    { id: USER_ADMIN, display_name: "Admin", email: "a@x.com", status: "active", deleted_at: null },
    { id: USER_TEACHER, display_name: "Teacher", email: "t@x.com", status: "active", deleted_at: null },
    { id: USER_TEACHER2, display_name: "Teacher2", email: "t2@x.com", status: "active", deleted_at: null },
    { id: USER_PARENT, display_name: "Parent", email: "p@x.com", status: "active", deleted_at: null },
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
  ];
  db.institute = [
    { id: INST_A, code: "A", name: "A", kind: "school", status: "active", deleted_at: null },
    { id: INST_B, code: "B", name: "B", kind: "school", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER2, user_id: USER_TEACHER2, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_PARENT, user_id: USER_PARENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_TEACHER2, role_code: "teacher" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
  ];
  db.teacher = [
    {
      id: TEACHER_A,
      institute_id: INST_A,
      user_profile_id: USER_TEACHER,
      display_name: "Teacher",
      status: "active",
      teaching_scope: "subject_teacher",
      portal_access_level: "faculty_grading",
      department: "Math",
      deleted_at: null,
    },
    {
      id: TEACHER_B,
      institute_id: INST_A,
      user_profile_id: USER_TEACHER2,
      display_name: "Teacher2",
      status: "active",
      teaching_scope: "subject_teacher",
      portal_access_level: "faculty_grading",
      department: "Science",
      deleted_at: null,
    },
  ];
  db.academic_year = [
    { id: YEAR_A, institute_id: INST_A, name: "2026", status: "active", deleted_at: null },
  ];
  db.class = [
    { id: CLASS_A, institute_id: INST_A, academic_year_id: YEAR_A, name: "10", deleted_at: null },
    { id: CLASS_B, institute_id: INST_A, academic_year_id: YEAR_A, name: "11", deleted_at: null },
  ];
  db.section = [
    {
      id: SECTION_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      class_teacher_id: TEACHER_A,
      name: "A",
      deleted_at: null,
    },
    {
      id: SECTION_B,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_B,
      class_teacher_id: TEACHER_B,
      name: "B",
      deleted_at: null,
    },
  ];
  db.teacher_assignment = [
    {
      id: ASSIGN_A,
      institute_id: INST_A,
      teacher_id: TEACHER_A,
      section_id: SECTION_A,
      class_id: CLASS_A,
      academic_year_id: YEAR_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.student = [
    {
      id: STUDENT_A,
      institute_id: INST_A,
      display_name: "Ada",
      first_name: "Ada",
      surname: "Lovelace",
      status: "active",
      deleted_at: null,
    },
    {
      id: STUDENT_B,
      institute_id: INST_A,
      display_name: "Bob",
      first_name: "Bob",
      surname: "Builder",
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
      class_id: CLASS_B,
      section_id: SECTION_B,
      status: "active",
      deleted_at: null,
    },
  ];
  db.parent = [
    {
      id: PARENT_A,
      institute_id: INST_A,
      user_profile_id: USER_PARENT,
      name: "Parent",
      access_status: "active",
      deleted_at: null,
    },
  ];
  db.guardian_link = [
    {
      id: "gl-1",
      institute_id: INST_A,
      parent_id: PARENT_A,
      student_id: STUDENT_A,
      status: "active",
      deleted_at: null,
    },
  ];
  return db;
}

function appWithDb(db: MockDb) {
  const tokens = {
    "token-admin": USER_ADMIN,
    "token-teacher": USER_TEACHER,
    "token-teacher2": USER_TEACHER2,
    "token-parent": USER_PARENT,
    "token-other": USER_OTHER,
  };
  return createApp(
    loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
    silentLogger,
    createMockSupabaseClients({ tokens, db }),
  );
}

describe("remarks", () => {
  it("allows teacher to create and list remark for scoped student", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    const create = await app.request("/api/v1/remarks", {
      method: "POST",
      headers: { ...auth("token-teacher"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
        type: "academic",
        text: "Strong progress in algebra this week.",
      }),
    });
    expect(create.status).toBe(201);
    const created = (await json(create)).data as { id: string; text: string; tone: string };
    expect(created.text).toContain("algebra");
    expect(created.tone).toBe("none");
    expect(db.student_remark).toHaveLength(1);

    const list = await app.request(`/api/v1/remarks?institute_id=${INST_A}`, {
      headers: auth("token-teacher"),
    });
    expect(list.status).toBe(200);
    const rows = (await json(list)).data as Array<{ id: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(created.id);
  });

  it("persists tone on create and update", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    const create = await app.request("/api/v1/remarks", {
      method: "POST",
      headers: { ...auth("token-teacher"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
        type: "academic",
        tone: "bad",
        text: "Needs more practice with fractions this week.",
      }),
    });
    expect(create.status).toBe(201);
    const created = (await json(create)).data as { id: string; tone: string };
    expect(created.tone).toBe("bad");

    const patch = await app.request(`/api/v1/remarks/${created.id}`, {
      method: "PATCH",
      headers: { ...auth("token-teacher"), "Content-Type": "application/json" },
      body: JSON.stringify({ tone: "good" }),
    });
    expect(patch.status).toBe(200);
    const updated = (await json(patch)).data as { tone: string };
    expect(updated.tone).toBe("good");
  });

  it("rejects remark for student outside teacher scope", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/remarks", {
      method: "POST",
      headers: { ...auth("token-teacher"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_B,
        type: "behaviour",
        text: "Needs more focus during class time.",
      }),
    });
    expect(res.status).toBe(403);
  });

  it("rejects short text", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/remarks", {
      method: "POST",
      headers: { ...auth("token-teacher"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
        type: "academic",
        text: "short",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("allows author to update and blocks other teacher", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    const create = await app.request("/api/v1/remarks", {
      method: "POST",
      headers: { ...auth("token-teacher"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
        type: "improvement",
        text: "Initial remark about handwriting skills.",
      }),
    });
    const id = ((await json(create)).data as { id: string }).id;

    const ok = await app.request(`/api/v1/remarks/${id}`, {
      method: "PATCH",
      headers: { ...auth("token-teacher"), "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Updated remark about handwriting skills." }),
    });
    expect(ok.status).toBe(200);

    const denied = await app.request(`/api/v1/remarks/${id}`, {
      method: "PATCH",
      headers: { ...auth("token-teacher2"), "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hijacked remark about handwriting skills." }),
    });
    expect(denied.status).toBe(403);
  });

  it("lets parent read linked child remarks only", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    await app.request("/api/v1/remarks", {
      method: "POST",
      headers: { ...auth("token-teacher"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
        type: "parent_note",
        text: "Please review homework schedule with Ada.",
      }),
    });
    // Teacher2 creates for Student B
    db.teacher_assignment.push({
      id: "ab-other",
      institute_id: INST_A,
      teacher_id: TEACHER_B,
      section_id: SECTION_B,
      class_id: CLASS_B,
      academic_year_id: YEAR_A,
      status: "active",
      deleted_at: null,
    });
    await app.request("/api/v1/remarks", {
      method: "POST",
      headers: { ...auth("token-teacher2"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_B,
        type: "academic",
        text: "Bob is doing well in science labs.",
      }),
    });

    const parentList = await app.request(`/api/v1/remarks?institute_id=${INST_A}`, {
      headers: auth("token-parent"),
    });
    expect(parentList.status).toBe(200);
    const rows = (await json(parentList)).data as Array<{ studentId: string }>;
    expect(rows.every((r) => r.studentId === STUDENT_A)).toBe(true);
    expect(rows.some((r) => r.studentId === STUDENT_B)).toBe(false);
  });

  it("blocks cross-institute list", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/remarks?institute_id=${INST_B}`, {
      headers: auth("token-teacher"),
    });
    expect(res.status).toBe(403);
  });
});
