/**
 * Phase 2 — academic history integrity around promotion / graduation.
 * Enrollment rows are the year-scoped history; denormalized student labels
 * follow the current active seat. Marks / attendance / fees stay pinned.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";
import { countBillableStudentsForInstitute } from "../src/domains/subscriptions/headcount.js";
import { RECYCLE_RETENTION_DAYS } from "../src/domains/recycle/types.js";
import { writableTrialSubscription } from "./helpers/subscription-fixture.js";

const silentLogger = createLogger("error");

const USER_ADMIN = "11111111-1111-4111-8111-111111111111";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const YEAR_A = "cc111111-1111-4111-8111-111111111111";
const YEAR_NEXT = "cc333333-3333-4333-8333-333333333333";
const CLASS_A = "cd111111-1111-4111-8111-111111111111";
const CLASS_NEXT = "cd333333-3333-4333-8333-333333333333";
const SECTION_A = "ce111111-1111-4111-8111-111111111111";
const SECTION_NEXT = "ce333333-3333-4333-8333-333333333333";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const ENROLL_A = "e1111111-1111-4111-8111-111111111111";
const EXAM_A = "ex111111-1111-4111-8111-111111111111";
const ENTRY_A = "me111111-1111-4111-8111-111111111111";
const SCORE_A = "ms111111-1111-4111-8111-111111111111";
const REGISTER_A = "ar111111-1111-4111-8111-111111111111";
const FEE_PLAN_A = "fp111111-1111-4111-8111-111111111111";
const STUDENT_FEE_A = "sf111111-1111-4111-8111-111111111111";
const PAYMENT_A = "py111111-1111-4111-8111-111111111111";
const SUB_A = "s0111111-1111-4111-8111-111111111111";

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
      email: "a@x.com",
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
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
  ];
  db.institute = [
    {
      id: INST_A,
      code: "A",
      name: "Alpha",
      kind: "school",
      status: "active",
      deleted_at: null,
    },
    {
      id: INST_B,
      code: "B",
      name: "Beta",
      kind: "school",
      status: "active",
      deleted_at: null,
    },
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
      deleted_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: YEAR_NEXT,
      institute_id: INST_A,
      name: "2027",
      code: "Y27",
      starts_on: "2027-04-01",
      ends_on: "2028-03-31",
      status: "upcoming",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
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
      deleted_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: CLASS_NEXT,
      institute_id: INST_A,
      academic_year_id: YEAR_NEXT,
      name: "Grade 11",
      code: "G11",
      sort_order: 1,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
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
      deleted_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: SECTION_NEXT,
      institute_id: INST_A,
      academic_year_id: YEAR_NEXT,
      class_id: CLASS_NEXT,
      name: "B",
      code: "B",
      capacity: 40,
      room: null,
      sort_order: 1,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
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
  ];
  db.exam = [
    {
      id: EXAM_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      name: "UT1",
      deleted_at: null,
    },
  ];
  db.mark_entry = [
    {
      id: ENTRY_A,
      institute_id: INST_A,
      exam_id: EXAM_A,
      academic_year_id: YEAR_A,
      section_id: SECTION_A,
      deleted_at: null,
    },
  ];
  db.mark_score = [
    {
      id: SCORE_A,
      institute_id: INST_A,
      mark_entry_id: ENTRY_A,
      enrollment_id: ENROLL_A,
      student_id: STUDENT_A,
      marks: 42,
      deleted_at: null,
    },
  ];
  db.attendance_register = [
    {
      id: REGISTER_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      section_id: SECTION_A,
      register_on: "2026-06-01",
      deleted_at: null,
    },
  ];
  db.fee_plan = [
    {
      id: FEE_PLAN_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      status: "published",
      deleted_at: null,
    },
  ];
  db.student_fee = [
    {
      id: STUDENT_FEE_A,
      institute_id: INST_A,
      fee_plan_id: FEE_PLAN_A,
      student_id: STUDENT_A,
      billed_amount: 1000,
      paid_amount: 500,
      status: "partial",
      deleted_at: null,
    },
  ];
  db.fee_payment = [
    {
      id: PAYMENT_A,
      institute_id: INST_A,
      fee_plan_id: FEE_PLAN_A,
      student_fee_id: STUDENT_FEE_A,
      student_id: STUDENT_A,
      amount: 500,
      receipt_no: "R-1",
      paid_on: "2026-05-01",
      deleted_at: null,
    },
  ];
  db.subscription = [
    {
      ...writableTrialSubscription(INST_A, SUB_A),
      active_student_count: 1,
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
      tokens: { "token-admin": USER_ADMIN },
      db,
    }),
  );
}

const jsonHeaders = {
  Authorization: "Bearer token-admin",
  "Content-Type": "application/json",
};

describe("academic history integrity", () => {
  it("promotion preserves year-scoped marks, attendance, and fees", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const promote = await app.request("/api/v1/enrollments/promote", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        institute_id: INST_A,
        source_academic_year_id: YEAR_A,
        target_academic_year_id: YEAR_NEXT,
        items: [
          {
            enrollment_id: ENROLL_A,
            target_class_id: CLASS_NEXT,
            target_section_id: SECTION_NEXT,
            roll_no: "7",
            action: "promote",
          },
        ],
      }),
    });
    expect(promote.status).toBe(200);

    // Historical enrollment intact
    expect(db.enrollment.find((e) => e.id === ENROLL_A)?.status).toBe(
      "completed",
    );
    expect(db.enrollment.find((e) => e.id === ENROLL_A)?.academic_year_id).toBe(
      YEAR_A,
    );

    // Marks stay on original enrollment + year graph
    expect(db.mark_score.find((s) => s.id === SCORE_A)?.enrollment_id).toBe(
      ENROLL_A,
    );
    expect(db.mark_score.find((s) => s.id === SCORE_A)?.deleted_at).toBeNull();
    expect(db.mark_entry.find((e) => e.id === ENTRY_A)?.academic_year_id).toBe(
      YEAR_A,
    );
    expect(
      db.attendance_register.find((r) => r.id === REGISTER_A)?.academic_year_id,
    ).toBe(YEAR_A);

    // Fees / receipts remain
    expect(db.student_fee.find((f) => f.id === STUDENT_FEE_A)?.deleted_at).toBeNull();
    expect(db.fee_payment.find((p) => p.id === PAYMENT_A)?.receipt_no).toBe(
      "R-1",
    );
    expect(db.fee_plan.find((p) => p.id === FEE_PLAN_A)?.academic_year_id).toBe(
      YEAR_A,
    );

    // Year filter does not mix years
    const yearA = await app.request(
      `/api/v1/enrollments?institute_id=${INST_A}&academic_year_id=${YEAR_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(yearA.status).toBe(200);
    const yearABody = await json(yearA);
    expect(yearABody.data.every((e: { academicYearId: string }) => e.academicYearId === YEAR_A)).toBe(
      true,
    );
    expect(yearABody.data.some((e: { id: string }) => e.id === ENROLL_A)).toBe(
      true,
    );

    const yearNext = await app.request(
      `/api/v1/enrollments?institute_id=${INST_A}&academic_year_id=${YEAR_NEXT}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    const yearNextBody = await json(yearNext);
    expect(
      yearNextBody.data.every(
        (e: { academicYearId: string }) => e.academicYearId === YEAR_NEXT,
      ),
    ).toBe(true);
    expect(
      yearNextBody.data.some((e: { studentId: string }) => e.studentId === STUDENT_A),
    ).toBe(true);

    // Current placement labels
    const student = db.student.find((s) => s.id === STUDENT_A);
    expect(student?.class_label).toBe("Grade 11");
    expect(student?.section_label).toBe("B");
    expect(student?.roll_no).toBe("7");
  });

  it("graduation preserves history and drops billable headcount", async () => {
    const db = baseDb();
    const clients = createMockSupabaseClients({ db, tokens: {} });
    expect(await countBillableStudentsForInstitute(clients.admin, INST_A)).toBe(
      1,
    );

    const app = appWithDb(db);
    const res = await app.request("/api/v1/enrollments/graduate", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        enrollment_ids: [ENROLL_A],
      }),
    });
    expect(res.status).toBe(200);

    expect(db.enrollment.find((e) => e.id === ENROLL_A)?.status).toBe(
      "graduated",
    );
    expect(db.enrollment.find((e) => e.id === ENROLL_A)?.deleted_at).toBeNull();
    expect(db.mark_score.find((s) => s.id === SCORE_A)?.enrollment_id).toBe(
      ENROLL_A,
    );
    expect(db.fee_payment.find((p) => p.id === PAYMENT_A)?.deleted_at).toBeNull();
    expect(db.student.find((s) => s.id === STUDENT_A)?.status).toBe("graduated");

    // Phase 0 rule: graduated profile or non-active enrollment → not billable
    expect(await countBillableStudentsForInstitute(clients.admin, INST_A)).toBe(
      0,
    );
  });

  it("documents recycle retention is 90 days for recycle_item bin only", () => {
    expect(RECYCLE_RETENTION_DAYS).toBe(90);
  });
});
