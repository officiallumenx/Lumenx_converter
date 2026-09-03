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
const TEACHER_A = "bb111111-1111-4111-8111-111111111111";
const PARENT_A = "ba111111-1111-4111-8111-111111111111";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const STUDENT_B = "ac222222-2222-4222-8222-222222222222";
const YEAR_A = "ee111111-1111-4111-8111-111111111111";
const CLASS_A = "ff111111-1111-4111-8111-111111111111";
const SECTION_A = "cc111111-1111-4111-8111-111111111111";
const ENROLL_A = "ad111111-1111-4111-8111-111111111111";
const LEAVE_STUDENT = "ae111111-1111-4111-8111-111111111111";
const LEAVE_TEACHER = "ae222222-2222-4222-8222-222222222222";
const LEAVE_OTHER = "ae333333-3333-4333-8333-333333333333";

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
  db.teacher = [
    {
      id: TEACHER_A,
      institute_id: INST_A,
      user_profile_id: USER_TEACHER,
      status: "active",
      deleted_at: null,
    },
  ];
  db.student = [
    {
      id: STUDENT_A,
      institute_id: INST_A,
      display_name: "Kid A",
      first_name: "Kid",
      surname: "A",
      deleted_at: null,
    },
    {
      id: STUDENT_B,
      institute_id: INST_A,
      display_name: "Kid B",
      first_name: "Kid",
      surname: "B",
      deleted_at: null,
    },
  ];
  db.parent = [
    { id: PARENT_A, institute_id: INST_A, user_profile_id: USER_PARENT, deleted_at: null },
  ];
  db.guardian_link = [
    {
      parent_id: PARENT_A,
      student_id: STUDENT_A,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.academic_year = [
    {
      id: YEAR_A,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.section = [
    {
      id: SECTION_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
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
  db.teacher_assignment = [
    {
      id: "af111111-1111-4111-8111-111111111111",
      institute_id: INST_A,
      teacher_id: TEACHER_A,
      section_id: SECTION_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.leave_request = [
    {
      id: LEAVE_STUDENT,
      institute_id: INST_A,
      subject_kind: "student",
      student_id: STUDENT_A,
      teacher_id: null,
      requested_by_user_id: USER_PARENT,
      leave_type: "general",
      intended_approver_role: null,
      start_date: "2026-09-01",
      end_date: "2026-09-02",
      reason: "Family wedding trip out of town.",
      status: "pending",
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      section_id: SECTION_A,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: LEAVE_TEACHER,
      institute_id: INST_A,
      subject_kind: "teacher",
      student_id: null,
      teacher_id: TEACHER_A,
      requested_by_user_id: USER_TEACHER,
      leave_type: "sick",
      intended_approver_role: "principal",
      start_date: "2026-09-10",
      end_date: "2026-09-10",
      reason: "Medical appointment morning.",
      status: "pending",
      academic_year_id: null,
      class_id: null,
      section_id: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: LEAVE_OTHER,
      institute_id: INST_B,
      subject_kind: "student",
      student_id: STUDENT_B,
      teacher_id: null,
      requested_by_user_id: USER_OTHER,
      leave_type: "general",
      intended_approver_role: null,
      start_date: "2026-09-01",
      end_date: "2026-09-01",
      reason: "Other institute leave request xx",
      status: "pending",
      academic_year_id: null,
      class_id: null,
      section_id: null,
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

describe("leave api", () => {
  it("lists leave for staff and scopes parent to linked students", async () => {
    const app = appWithDb(baseDb());

    const staff = await app.request(
      `/api/v1/leave/requests?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(staff.status).toBe(200);
    expect((await json(staff)).data).toHaveLength(2);

    const parent = await app.request(
      `/api/v1/leave/requests?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(parent.status).toBe(200);
    const parentBody = await json(parent);
    expect(parentBody.data).toHaveLength(1);
    expect(parentBody.data[0].studentId).toBe(STUDENT_A);

    const cross = await app.request(
      `/api/v1/leave/requests?institute_id=${INST_B}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(cross.status).toBe(403);
  });

  it("parent creates student leave with enrollment snapshot", async () => {
    const db = baseDb();
    db.leave_request = [];
    const app = appWithDb(db);

    const res = await app.request("/api/v1/leave/requests", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject_kind: "student",
        institute_id: INST_A,
        student_id: STUDENT_A,
        start_date: "2026-09-20",
        end_date: "2026-09-21",
        reason: "Dental procedure for the child.",
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.subjectKind).toBe("student");
    expect(body.data.status).toBe("pending");
    expect(body.data.leaveType).toBe("general");
    expect(body.data.sectionId).toBe(SECTION_A);
    expect(body.data.academicYearId).toBe(YEAR_A);
  });

  it("blocks parent from creating leave for unlinked student", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/leave/requests", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject_kind: "student",
        institute_id: INST_A,
        student_id: STUDENT_B,
        start_date: "2026-09-20",
        end_date: "2026-09-20",
        reason: "Trying to apply for another child.",
      }),
    });
    expect(res.status).toBe(403);
  });

  it("teacher creates own leave; parent cannot", async () => {
    const db = baseDb();
    db.leave_request = [];
    const app = appWithDb(db);

    const ok = await app.request("/api/v1/leave/requests", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject_kind: "teacher",
        institute_id: INST_A,
        leave_type: "casual",
        intended_approver_role: "institute_admin",
        start_date: "2026-09-15",
        end_date: "2026-09-15",
        reason: "Personal errand half day.",
      }),
    });
    expect(ok.status).toBe(201);
    const body = await json(ok);
    expect(body.data.teacherId).toBe(TEACHER_A);
    expect(body.data.leaveType).toBe("casual");

    const denied = await app.request("/api/v1/leave/requests", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject_kind: "teacher",
        institute_id: INST_A,
        leave_type: "sick",
        intended_approver_role: "principal",
        start_date: "2026-09-15",
        end_date: "2026-09-15",
        reason: "Parent should not create this.",
      }),
    });
    expect(denied.status).toBe(403);
  });

  it("teacher decides student leave; teacher cannot decide teacher leave", async () => {
    const app = appWithDb(baseDb());

    const decideStudent = await app.request(
      `/api/v1/leave/requests/${LEAVE_STUDENT}/decide`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-teacher",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outcome: "approved",
          note: "Approved by class teacher.",
        }),
      },
    );
    expect(decideStudent.status).toBe(200);
    const studentBody = await json(decideStudent);
    expect(studentBody.data.request.status).toBe("approved");
    expect(studentBody.data.decision.outcome).toBe("approved");

    const decideTeacher = await app.request(
      `/api/v1/leave/requests/${LEAVE_TEACHER}/decide`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-teacher",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ outcome: "approved" }),
      },
    );
    expect(decideTeacher.status).toBe(403);
  });

  it("blocks teachers without an assignment covering the student", async () => {
    const USER_OTHER_TEACHER = "66666666-6666-4666-8666-666666666666";
    const MEMBER_OTHER_TEACHER = "aa666666-6666-4666-8666-666666666666";
    const TEACHER_B = "bb222222-2222-4222-8222-222222222222";
    const db = baseDb();
    db.user_profile.push({
      id: USER_OTHER_TEACHER,
      display_name: "Other Teacher",
      email: "ot@x.com",
      status: "active",
      deleted_at: null,
    });
    db.membership.push({
      id: MEMBER_OTHER_TEACHER,
      user_id: USER_OTHER_TEACHER,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    });
    db.membership_role.push({
      membership_id: MEMBER_OTHER_TEACHER,
      role_code: "teacher",
    });
    db.teacher.push({
      id: TEACHER_B,
      institute_id: INST_A,
      user_profile_id: USER_OTHER_TEACHER,
      status: "active",
      deleted_at: null,
    });

    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({
        tokens: {
          "token-admin": USER_ADMIN,
          "token-teacher": USER_TEACHER,
          "token-other-teacher": USER_OTHER_TEACHER,
          "token-parent": USER_PARENT,
          "token-other": USER_OTHER,
        },
        db,
      }),
    );

    const denied = await app.request(
      `/api/v1/leave/requests/${LEAVE_STUDENT}/decide`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-other-teacher",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ outcome: "approved" }),
      },
    );
    expect(denied.status).toBe(403);
  });

  it("admin decides teacher leave and returns decision", async () => {
    const app = appWithDb(baseDb());

    const decide = await app.request(
      `/api/v1/leave/requests/${LEAVE_TEACHER}/decide`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outcome: "ignored",
          note: "Cover already arranged.",
        }),
      },
    );
    expect(decide.status).toBe(200);
    expect((await json(decide)).data.request.status).toBe("ignored");

    const getDecision = await app.request(
      `/api/v1/leave/requests/${LEAVE_TEACHER}/decision`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(getDecision.status).toBe(200);
    expect((await json(getDecision)).data.outcome).toBe("ignored");

    const again = await app.request(
      `/api/v1/leave/requests/${LEAVE_TEACHER}/decide`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ outcome: "approved" }),
      },
    );
    expect(again.status).toBe(409);
  });

  it("parent cancels pending student leave", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/leave/requests/${LEAVE_STUDENT}/cancel`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-parent" },
      },
    );
    expect(res.status).toBe(200);
    expect((await json(res)).data.status).toBe("cancelled");
  });

  it("blocks reading another institute leave by id", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/leave/requests/${LEAVE_OTHER}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(res.status).toBe(403);
  });
});
