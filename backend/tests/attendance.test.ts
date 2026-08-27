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
const TEACHER_A = "bb111111-1111-4111-8111-111111111111";
const PARENT_A = "ba111111-1111-4111-8111-111111111111";
const SECTION_A = "cc111111-1111-4111-8111-111111111111";
const SECTION_B = "cc222222-2222-4222-8222-222222222222";
const SUBJECT_A = "dd111111-1111-4111-8111-111111111111";
const YEAR_A = "ee111111-1111-4111-8111-111111111111";
const YEAR_B = "ee222222-2222-4222-8222-222222222222";
const CLASS_A = "ff111111-1111-4111-8111-111111111111";
const CLASS_B = "ff222222-2222-4222-8222-222222222222";
const ASSIGN_A = "ab111111-1111-4111-8111-111111111111";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const STUDENT_B = "ac222222-2222-4222-8222-222222222222";
const ENROLL_A = "ad111111-1111-4111-8111-111111111111";
const ENROLL_B = "ad222222-2222-4222-8222-222222222222";
const CONFIG_A = "ae111111-1111-4111-8111-111111111111";
const REGISTER_A = "af111111-1111-4111-8111-111111111111";
const MARK_A = "b0111111-1111-4111-8111-111111111111";
const MARK_B = "b0222222-2222-4222-8222-222222222222";

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
    {
      id: USER_ADMIN,
      display_name: "Admin",
      email: "admin@example.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_TEACHER,
      display_name: "Teacher",
      email: "teacher@example.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_STUDENT,
      display_name: "Student",
      email: "student@example.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_OTHER,
      display_name: "OtherAdmin",
      email: "other@example.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_PARENT,
      display_name: "Parent",
      email: "parent@example.com",
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership = [
    {
      id: MEMBER_ADMIN,
      user_id: USER_ADMIN,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
    {
      id: MEMBER_TEACHER,
      user_id: USER_TEACHER,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
    {
      id: MEMBER_STUDENT,
      user_id: USER_STUDENT,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
    {
      id: MEMBER_OTHER,
      user_id: USER_OTHER,
      institute_id: INST_B,
      status: "active",
      deleted_at: null,
    },
    {
      id: MEMBER_PARENT,
      user_id: USER_PARENT,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_STUDENT, role_code: "student" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
  ];
  db.teacher = [
    {
      id: TEACHER_A,
      institute_id: INST_A,
      user_profile_id: USER_TEACHER,
      status: "active",
      deleted_at: null,
    },
  ];
  db.parent = [
    {
      id: PARENT_A,
      institute_id: INST_A,
      user_profile_id: USER_PARENT,
      deleted_at: null,
    },
  ];
  db.guardian_link = [
    {
      id: "bc111111-1111-4111-8111-111111111111",
      institute_id: INST_A,
      student_id: STUDENT_A,
      parent_id: PARENT_A,
      relationship: "father",
      is_primary: true,
      status: "active",
      deleted_at: null,
    },
  ];
  db.student = [
    { id: STUDENT_A, institute_id: INST_A, user_profile_id: USER_STUDENT, deleted_at: null },
    { id: STUDENT_B, institute_id: INST_A, user_profile_id: null, deleted_at: null },
  ];
  db.section = [
    {
      id: SECTION_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      deleted_at: null,
    },
    {
      id: SECTION_B,
      institute_id: INST_B,
      academic_year_id: YEAR_B,
      class_id: CLASS_B,
      deleted_at: null,
    },
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
  db.attendance_config_version = [
    {
      id: CONFIG_A,
      institute_id: INST_A,
      effective_from: "2026-01-01",
      method: "daily",
      owner: "current_period_teacher",
      scope: "institute",
      class_codes: [],
      section_codes: [],
      created_by_user_profile_id: USER_ADMIN,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.attendance_register = [
    {
      id: REGISTER_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      section_id: SECTION_A,
      config_version_id: CONFIG_A,
      method: "daily",
      owner: "current_period_teacher",
      attendance_date: "2026-08-01",
      slot_kind: "day",
      slot_code: "slot:day",
      period_index: null,
      timetable_slot_id: null,
      slot_label: "Full day",
      subject_label: null,
      starts_at: null,
      ends_at: null,
      status: "draft",
      marked_by_teacher_id: TEACHER_A,
      submitted_at: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.attendance_mark = [
    {
      id: MARK_A,
      institute_id: INST_A,
      register_id: REGISTER_A,
      student_id: STUDENT_A,
      enrollment_id: ENROLL_A,
      status: "present",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: MARK_B,
      institute_id: INST_A,
      register_id: REGISTER_A,
      student_id: STUDENT_B,
      enrollment_id: ENROLL_B,
      status: "absent",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  return db;
}

function appWithDb(
  db: MockDb,
  tokens: Record<string, string> = {
    "token-admin": USER_ADMIN,
    "token-teacher": USER_TEACHER,
    "token-student": USER_STUDENT,
    "token-other": USER_OTHER,
    "token-parent": USER_PARENT,
  },
) {
  const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
  return createApp(env, silentLogger, createMockSupabaseClients({ tokens, db }));
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const validCreateBody = {
  institute_id: INST_A,
  academic_year_id: YEAR_A,
  class_id: CLASS_A,
  section_id: SECTION_A,
  config_version_id: CONFIG_A,
  attendance_date: "2026-08-02",
  slot_kind: "day",
  slot_code: "slot:day",
  slot_label: "Full day",
  marks: [
    { enrollment_id: ENROLL_A, status: "present" },
    { enrollment_id: ENROLL_B, status: "absent" },
  ],
};

describe("attendance — authentication", () => {
  it("returns 401 without JWT", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/attendance/registers?institute_id=${INST_A}`);
    expect(res.status).toBe(401);
  });

  it("returns 401 for invalid JWT", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/attendance/registers?institute_id=${INST_A}`, {
      headers: auth("bad"),
    });
    expect(res.status).toBe(401);
  });
});

describe("attendance — tenant isolation", () => {
  it("rejects listing another institute", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/attendance/registers?institute_id=${INST_B}`, {
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(403);
  });

  it("rejects create with spoofed institute_id", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/attendance/registers", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validCreateBody,
        institute_id: INST_B,
        academic_year_id: YEAR_B,
        class_id: CLASS_B,
        section_id: SECTION_B,
      }),
    });
    expect(res.status).toBe(403);
  });

  it("rejects cross-institute section on create", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/attendance/registers", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validCreateBody,
        section_id: SECTION_B,
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe("attendance — authorization", () => {
  it("allows admin to list and get registers", async () => {
    const app = appWithDb(baseDb());
    const list = await app.request(`/api/v1/attendance/registers?institute_id=${INST_A}`, {
      headers: auth("token-admin"),
    });
    expect(list.status).toBe(200);
    expect((await json(list)).data[0].id).toBe(REGISTER_A);

    const get = await app.request(`/api/v1/attendance/registers/${REGISTER_A}`, {
      headers: auth("token-admin"),
    });
    expect(get.status).toBe(200);
    const marks = (await json(get)).data.marks;
    expect(marks).toHaveLength(2);
    expect(marks.map((m: { studentId: string }) => m.studentId).sort()).toEqual(
      [STUDENT_A, STUDENT_B].sort(),
    );
  });

  it("allows assigned teacher to create draft register", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/attendance/registers", {
      method: "POST",
      headers: { ...auth("token-teacher"), "Content-Type": "application/json" },
      body: JSON.stringify(validCreateBody),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.status).toBe("draft");
    expect(body.data.markedByTeacherId).toBe(TEACHER_A);
    expect(body.data.marks).toHaveLength(2);
  });

  it("forbids teacher without assignment", async () => {
    const db = baseDb();
    db.teacher_assignment = [];
    const app = appWithDb(db);
    const res = await app.request("/api/v1/attendance/registers", {
      method: "POST",
      headers: { ...auth("token-teacher"), "Content-Type": "application/json" },
      body: JSON.stringify(validCreateBody),
    });
    expect(res.status).toBe(403);
  });

  it("forbids student from creating config", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/attendance/config", {
      method: "POST",
      headers: { ...auth("token-student"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        effective_from: "2026-09-01",
        method: "daily",
        owner: "current_period_teacher",
        scope: "institute",
      }),
    });
    expect(res.status).toBe(403);
  });

  it("allows student to read own register marks", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/attendance/registers/${REGISTER_A}`, {
      headers: auth("token-student"),
    });
    expect(res.status).toBe(200);
    expect((await json(res)).data.marks[0].studentId).toBe(STUDENT_A);
  });
});

describe("attendance — mark privacy", () => {
  it("does not return peer student marks to a learner", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/attendance/registers/${REGISTER_A}`, {
      headers: auth("token-student"),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    const marks = body.data.marks as Array<{
      id: string;
      studentId: string;
      enrollmentId: string;
    }>;
    expect(marks).toHaveLength(1);
    expect(marks[0].studentId).toBe(STUDENT_A);
    expect(marks[0].id).toBe(MARK_A);
    expect(marks.some((m) => m.studentId === STUDENT_B)).toBe(false);
    expect(marks.some((m) => m.id === MARK_B)).toBe(false);
    expect(marks.some((m) => m.enrollmentId === ENROLL_B)).toBe(false);
  });

  it("does not return unrelated child marks to a parent", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/attendance/registers/${REGISTER_A}`, {
      headers: auth("token-parent"),
    });
    expect(res.status).toBe(200);
    const marks = (await json(res)).data.marks as Array<{
      id: string;
      studentId: string;
    }>;
    expect(marks).toHaveLength(1);
    expect(marks[0].studentId).toBe(STUDENT_A);
    expect(marks.some((m) => m.studentId === STUDENT_B)).toBe(false);
    expect(marks.some((m) => m.id === MARK_B)).toBe(false);
  });

  it("still returns full register marks to staff", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/attendance/registers/${REGISTER_A}`, {
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(200);
    expect((await json(res)).data.marks).toHaveLength(2);
  });
});

describe("attendance — workflow immutability", () => {
  it("submits draft and blocks further patch", async () => {
    const app = appWithDb(baseDb());
    const submit = await app.request(`/api/v1/attendance/registers/${REGISTER_A}/submit`, {
      method: "POST",
      headers: auth("token-admin"),
    });
    expect(submit.status).toBe(200);
    expect((await json(submit)).data.status).toBe("submitted");

    const patch = await app.request(`/api/v1/attendance/registers/${REGISTER_A}`, {
      method: "PATCH",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        marks: [{ enrollment_id: ENROLL_A, status: "absent" }],
      }),
    });
    expect(patch.status).toBe(409);
  });

  it("rejects invalid mark status and missing enrollment graph", async () => {
    const app = appWithDb(baseDb());
    const badStatus = await app.request("/api/v1/attendance/registers", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validCreateBody,
        marks: [{ enrollment_id: ENROLL_A, status: "late" }],
      }),
    });
    expect(badStatus.status).toBe(400);

    const badEnroll = await app.request("/api/v1/attendance/registers", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validCreateBody,
        marks: [
          {
            enrollment_id: "00000000-0000-4000-8000-000000000099",
            status: "present",
          },
        ],
      }),
    });
    expect(badEnroll.status).toBe(400);
  });
});

describe("attendance — config + health", () => {
  it("allows admin to append config version", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/attendance/config", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        effective_from: "2026-09-01",
        method: "period_wise",
        owner: "current_period_teacher",
        scope: "institute",
      }),
    });
    expect(res.status).toBe(201);
    expect((await json(res)).data.method).toBe("period_wise");
  });

  it("keeps health endpoints available", async () => {
    const app = appWithDb(baseDb());
    expect((await app.request("/api/v1/health")).status).toBe(200);
  });
});
