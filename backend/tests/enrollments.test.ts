import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";
import { writableTrialSubscription } from "./helpers/subscription-fixture.js";

const silentLogger = createLogger("error");

const USER_ADMIN = "11111111-1111-4111-8111-111111111111";
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const YEAR_A = "cc111111-1111-4111-8111-111111111111";
const CLASS_A = "cd111111-1111-4111-8111-111111111111";
const SECTION_A = "ce111111-1111-4111-8111-111111111111";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const STUDENT_B = "ac222222-2222-4222-8222-222222222222";
const ENROLL_A = "e1111111-1111-4111-8111-111111111111";
const ENROLL_B_OTHER_INST = "e2222222-2222-4222-8222-222222222222";
const YEAR_B = "cc222222-2222-4222-8222-222222222222";
const CLASS_B = "cd222222-2222-4222-8222-222222222222";
const SECTION_B = "ce222222-2222-4222-8222-222222222222";
const YEAR_A_NEXT = "cc333333-3333-4333-8333-333333333333";
const CLASS_A_NEXT = "cd333333-3333-4333-8333-333333333333";
const SECTION_A_NEXT = "ce333333-3333-4333-8333-333333333333";
const SUB_A = "s0111111-1111-4111-8111-111111111111";
const SUB_B = "s0222222-2222-4222-8222-222222222222";

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
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
  ];
  db.academic_year = [
    {
      id: YEAR_A,
      institute_id: INST_A,
      name: "2026",
      code: "Y26",
      starts_on: "2026-04-01",
      ends_on: "2027-03-31",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: YEAR_A_NEXT,
      institute_id: INST_A,
      name: "2027",
      code: "Y27",
      starts_on: "2027-04-01",
      ends_on: "2028-03-31",
      status: "upcoming",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: YEAR_B,
      institute_id: INST_B,
      name: "2026B",
      code: "Y26B",
      starts_on: "2026-04-01",
      ends_on: "2027-03-31",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];
  db.class = [
    {
      id: CLASS_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      name: "Grade 10",
      code: "G10",
      sort_order: 1,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: CLASS_A_NEXT,
      institute_id: INST_A,
      academic_year_id: YEAR_A_NEXT,
      name: "Grade 11",
      code: "G11",
      sort_order: 1,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: CLASS_B,
      institute_id: INST_B,
      academic_year_id: YEAR_B,
      name: "Grade 10",
      code: "G10",
      sort_order: 1,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
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
      room: null,
      sort_order: 1,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: SECTION_A_NEXT,
      institute_id: INST_A,
      academic_year_id: YEAR_A_NEXT,
      class_id: CLASS_A_NEXT,
      name: "A",
      code: "A",
      capacity: 40,
      room: null,
      sort_order: 1,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: SECTION_B,
      institute_id: INST_B,
      academic_year_id: YEAR_B,
      class_id: CLASS_B,
      name: "A",
      code: "A",
      capacity: 40,
      room: null,
      sort_order: 1,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];
  db.student = [
    {
      id: STUDENT_A,
      institute_id: INST_A,
      first_name: "Ada",
      surname: "Lovelace",
      display_name: "Ada Lovelace",
      class_label: "Grade 10",
      section_label: "A",
      roll_no: "1",
      status: "active",
      deleted_at: null,
    },
    {
      id: STUDENT_B,
      institute_id: INST_B,
      first_name: "Other",
      surname: "Student",
      display_name: "Other Student",
      class_label: "Grade 10",
      section_label: "A",
      roll_no: "1",
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
      roll_no: "1",
      status: "active",
      enrolled_on: "2026-04-01",
      withdrawn_on: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: ENROLL_B_OTHER_INST,
      institute_id: INST_B,
      academic_year_id: YEAR_B,
      student_id: STUDENT_B,
      class_id: CLASS_B,
      section_id: SECTION_B,
      roll_no: "1",
      status: "active",
      enrolled_on: "2026-04-01",
      withdrawn_on: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];
  db.subscription = [
    writableTrialSubscription(INST_A, SUB_A),
    writableTrialSubscription(INST_B, SUB_B),
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
        "token-other": USER_OTHER,
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

describe("enrollments API", () => {
  it("lists enrollments for institute section", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/enrollments?institute_id=${INST_A}&section_id=${SECTION_A}`,
      { headers: auth("token-admin") },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(ENROLL_A);
    expect(body.data[0].studentName).toBe("Ada Lovelace");
  });

  it("rejects invalid institute UUID", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/enrollments?institute_id=not-a-uuid&section_id=${SECTION_A}`,
      { headers: auth("token-admin") },
    );
    expect(res.status).toBe(400);
  });

  it("isolates institutes — INST_A admin cannot list INST_B enrollments", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/enrollments?institute_id=${INST_B}&section_id=${SECTION_B}`,
      { headers: auth("token-admin") },
    );
    expect(res.status).toBe(403);
  });

  it("forbids get of other institute enrollment", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/enrollments/${ENROLL_B_OTHER_INST}`, {
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(403);
  });

  it("creates enrollment in institute", async () => {
    const db = baseDb();
    db.enrollment = [];
    const app = appWithDb(db);
    const res = await app.request("/api/v1/enrollments", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        student_id: STUDENT_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        roll_no: "12",
        enrolled_on: "2026-04-15",
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.studentId).toBe(STUDENT_A);
    expect(body.data.rollNo).toBe("12");
    expect(body.data.status).toBe("active");
  });

  it("rejects create with cross-institute student", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/enrollments", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        student_id: STUDENT_B,
        class_id: CLASS_A,
        section_id: SECTION_A,
        roll_no: "99",
        enrolled_on: "2026-04-15",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("requires auth", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/enrollments?institute_id=${INST_A}`,
    );
    expect(res.status).toBe(401);
  });

  it("updates enrollment roll number and status", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/enrollments/${ENROLL_A}`, {
      method: "PATCH",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        roll_no: "8",
        status: "transferred",
      }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.rollNo).toBe("8");
    expect(body.data.status).toBe("transferred");
    expect(body.data.withdrawnOn).toBeTruthy();
  });

  it("forbids patch of other institute enrollment", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/enrollments/${ENROLL_B_OTHER_INST}`, {
      method: "PATCH",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ roll_no: "99" }),
    });
    expect(res.status).toBe(403);
  });

  it("promote creates target enrollment and completes source", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    const res = await app.request("/api/v1/enrollments/promote", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        source_academic_year_id: YEAR_A,
        target_academic_year_id: YEAR_A_NEXT,
        items: [
          {
            enrollment_id: ENROLL_A,
            target_class_id: CLASS_A_NEXT,
            target_section_id: SECTION_A_NEXT,
            roll_no: "5",
            action: "promote",
          },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.items).toHaveLength(1);
    const item = body.data.items[0];
    expect(item.action).toBe("promote");
    expect(item.sourceEnrollment.id).toBe(ENROLL_A);
    expect(item.sourceEnrollment.status).toBe("completed");
    expect(item.sourceEnrollment.withdrawnOn).toBeTruthy();
    expect(item.targetEnrollment).toBeTruthy();
    expect(item.targetEnrollment.academicYearId).toBe(YEAR_A_NEXT);
    expect(item.targetEnrollment.classId).toBe(CLASS_A_NEXT);
    expect(item.targetEnrollment.sectionId).toBe(SECTION_A_NEXT);
    expect(item.targetEnrollment.studentId).toBe(STUDENT_A);
    expect(item.targetEnrollment.rollNo).toBe("5");
    expect(item.targetEnrollment.status).toBe("active");

    // Previous-year enrollment row remains (history) with original class/year.
    const sourceRow = db.enrollment.find((e) => e.id === ENROLL_A);
    expect(sourceRow?.academic_year_id).toBe(YEAR_A);
    expect(sourceRow?.class_id).toBe(CLASS_A);
    expect(sourceRow?.status).toBe("completed");

    // Current denormalized placement follows the new active enrollment.
    const student = db.student.find((s) => s.id === STUDENT_A);
    expect(student?.class_label).toBe("Grade 11");
    expect(student?.section_label).toBe("A");
    expect(student?.roll_no).toBe("5");
    expect(student?.status).toBe("active");
  });

  it("graduate sets enrollment + student graduated without erasing history", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    const res = await app.request("/api/v1/enrollments/graduate", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        enrollment_ids: [ENROLL_A],
      }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(ENROLL_A);
    expect(body.data[0].status).toBe("graduated");
    expect(body.data[0].withdrawnOn).toBeTruthy();

    const enrollment = db.enrollment.find((e) => e.id === ENROLL_A);
    expect(enrollment?.academic_year_id).toBe(YEAR_A);
    expect(enrollment?.class_id).toBe(CLASS_A);
    expect(enrollment?.deleted_at).toBeNull();

    const student = db.student.find((s) => s.id === STUDENT_A);
    expect(student?.status).toBe("graduated");
    expect(student?.deleted_at).toBeNull();
    // Last placement labels retained for directory; history is the enrollment row.
    expect(student?.class_label).toBe("Grade 10");
  });

  it("create enrollment syncs student class/section/roll labels", async () => {
    const db = baseDb();
    db.enrollment = [];
    db.student[0] = {
      ...db.student[0]!,
      class_label: null,
      section_label: null,
      roll_no: null,
    };
    const app = appWithDb(db);
    const res = await app.request("/api/v1/enrollments", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        student_id: STUDENT_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        roll_no: "12",
        enrolled_on: "2026-04-15",
      }),
    });
    expect(res.status).toBe(201);
    const student = db.student.find((s) => s.id === STUDENT_A);
    expect(student?.class_label).toBe("Grade 10");
    expect(student?.section_label).toBe("A");
    expect(student?.roll_no).toBe("12");
  });

  it("transfer sets student inactive and keeps enrollment history", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    const res = await app.request("/api/v1/enrollments/promote", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        source_academic_year_id: YEAR_A,
        target_academic_year_id: YEAR_A_NEXT,
        items: [{ enrollment_id: ENROLL_A, action: "transfer" }],
      }),
    });
    expect(res.status).toBe(200);
    expect(db.enrollment.find((e) => e.id === ENROLL_A)?.status).toBe(
      "transferred",
    );
    expect(db.enrollment.find((e) => e.id === ENROLL_A)?.deleted_at).toBeNull();
    expect(db.student.find((s) => s.id === STUDENT_A)?.status).toBe("inactive");
  });
});
