import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  countBillableStudentsForInstitute,
  syncSubscriptionActiveStudentCount,
} from "../src/domains/subscriptions/headcount.js";
import { resolveInstituteWriteGate } from "../src/domains/subscriptions/write-gate.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";

const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SUB_A = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const STU_1 = "11111111-1111-4111-8111-111111111111";
const STU_2 = "22222222-2222-4222-8222-222222222222";
const STU_3 = "33333333-3333-4333-8333-333333333333";
const YEAR_A = "44444444-4444-4444-8444-444444444444";
const YEAR_B = "55555555-5555-4555-8555-555555555555";
const CLASS_A = "66666666-6666-4666-8666-666666666666";
const SEC_A = "77777777-7777-4777-8777-777777777777";

beforeEach(() => {
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function seedDb(): MockDb {
  const db = emptyMockDb();
  db.institute = [
    {
      id: INST_A,
      code: "LX-A",
      name: "Alpha",
      kind: "school",
      status: "active",
      deleted_at: null,
    },
    {
      id: INST_B,
      code: "LX-B",
      name: "Beta",
      kind: "school",
      status: "active",
      deleted_at: null,
    },
  ];
  db.subscription = [
    {
      id: SUB_A,
      institute_id: INST_A,
      lifecycle_status: "trial_active",
      assigned_rate_inr: 12,
      active_student_count: 0,
      trial_start_at: "2026-08-01T00:00:00.000Z",
      trial_end_at: "2026-12-01T00:00:00.000Z",
      grace_ends_at: "2026-12-08T00:00:00.000Z",
      current_period_id: null,
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];
  db.academic_year = [
    {
      id: YEAR_A,
      institute_id: INST_A,
      code: "2025-26",
      status: "completed",
      deleted_at: null,
    },
    {
      id: YEAR_B,
      institute_id: INST_A,
      code: "2026-27",
      status: "active",
      deleted_at: null,
    },
  ];
  db.class = [
    {
      id: CLASS_A,
      institute_id: INST_A,
      academic_year_id: YEAR_B,
      deleted_at: null,
    },
  ];
  db.section = [
    {
      id: SEC_A,
      institute_id: INST_A,
      academic_year_id: YEAR_B,
      class_id: CLASS_A,
      deleted_at: null,
    },
  ];
  db.student = [
    {
      id: STU_1,
      institute_id: INST_A,
      first_name: "A",
      surname: "One",
      status: "active",
      deleted_at: null,
    },
    {
      id: STU_2,
      institute_id: INST_A,
      first_name: "B",
      surname: "Two",
      status: "active",
      deleted_at: null,
    },
    {
      id: STU_3,
      institute_id: INST_A,
      first_name: "C",
      surname: "Three",
      status: "graduated",
      deleted_at: null,
    },
  ];
  return db;
}

describe("billable student headcount", () => {
  it("counts distinct active enrollments only", async () => {
    const db = seedDb();
    db.enrollment = [
      {
        id: "e1",
        institute_id: INST_A,
        academic_year_id: YEAR_B,
        student_id: STU_1,
        class_id: CLASS_A,
        section_id: SEC_A,
        status: "active",
        deleted_at: null,
      },
      {
        id: "e2",
        institute_id: INST_A,
        academic_year_id: YEAR_B,
        student_id: STU_2,
        class_id: CLASS_A,
        section_id: SEC_A,
        status: "active",
        deleted_at: null,
      },
      {
        id: "e3",
        institute_id: INST_A,
        academic_year_id: YEAR_B,
        student_id: STU_3,
        class_id: CLASS_A,
        section_id: SEC_A,
        status: "active",
        deleted_at: null,
      },
    ];
    const admin = createMockSupabaseClients({ db, tokens: {} }).admin;
    // STU_3 graduated profile excluded even with active enrollment
    expect(await countBillableStudentsForInstitute(admin, INST_A)).toBe(2);
  });

  it("does not double-count a student across academic years", async () => {
    const db = seedDb();
    db.enrollment = [
      {
        id: "e-old",
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        student_id: STU_1,
        class_id: CLASS_A,
        section_id: SEC_A,
        status: "completed",
        deleted_at: null,
      },
      {
        id: "e-new",
        institute_id: INST_A,
        academic_year_id: YEAR_B,
        student_id: STU_1,
        class_id: CLASS_A,
        section_id: SEC_A,
        status: "active",
        deleted_at: null,
      },
    ];
    const admin = createMockSupabaseClients({ db, tokens: {} }).admin;
    expect(await countBillableStudentsForInstitute(admin, INST_A)).toBe(1);
  });

  it("excludes withdrawn / graduated / deleted enrollments and deleted students", async () => {
    const db = seedDb();
    db.student.push({
      id: "88888888-8888-4888-8888-888888888888",
      institute_id: INST_A,
      first_name: "D",
      surname: "Del",
      status: "active",
      deleted_at: "2026-01-01T00:00:00.000Z",
    });
    db.enrollment = [
      {
        id: "e-drop",
        institute_id: INST_A,
        academic_year_id: YEAR_B,
        student_id: STU_1,
        class_id: CLASS_A,
        section_id: SEC_A,
        status: "dropped_out",
        deleted_at: null,
      },
      {
        id: "e-grad",
        institute_id: INST_A,
        academic_year_id: YEAR_B,
        student_id: STU_2,
        class_id: CLASS_A,
        section_id: SEC_A,
        status: "graduated",
        deleted_at: null,
      },
      {
        id: "e-del",
        institute_id: INST_A,
        academic_year_id: YEAR_B,
        student_id: "88888888-8888-4888-8888-888888888888",
        class_id: CLASS_A,
        section_id: SEC_A,
        status: "active",
        deleted_at: null,
      },
    ];
    const admin = createMockSupabaseClients({ db, tokens: {} }).admin;
    expect(await countBillableStudentsForInstitute(admin, INST_A)).toBe(0);
  });

  it("syncs subscription.active_student_count from enrollments", async () => {
    const db = seedDb();
    db.enrollment = [
      {
        id: "e1",
        institute_id: INST_A,
        academic_year_id: YEAR_B,
        student_id: STU_1,
        class_id: CLASS_A,
        section_id: SEC_A,
        status: "active",
        deleted_at: null,
      },
      {
        id: "e2",
        institute_id: INST_A,
        academic_year_id: YEAR_B,
        student_id: STU_2,
        class_id: CLASS_A,
        section_id: SEC_A,
        status: "active",
        deleted_at: null,
      },
    ];
    const admin = createMockSupabaseClients({ db, tokens: {} }).admin;
    const result = await syncSubscriptionActiveStudentCount(admin, INST_A);
    expect(result.updated).toBe(true);
    expect(result.count).toBe(2);
    expect(db.subscription[0]!.active_student_count).toBe(2);
  });

  it("does not update another institute's subscription from INST_A enrollments", async () => {
    const db = seedDb();
    db.subscription.push({
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      institute_id: INST_B,
      lifecycle_status: "trial_active",
      assigned_rate_inr: 12,
      active_student_count: 99,
      trial_start_at: "2026-08-01T00:00:00.000Z",
      trial_end_at: "2026-12-01T00:00:00.000Z",
      grace_ends_at: "2026-12-08T00:00:00.000Z",
      current_period_id: null,
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    db.enrollment = [
      {
        id: "e1",
        institute_id: INST_A,
        academic_year_id: YEAR_B,
        student_id: STU_1,
        class_id: CLASS_A,
        section_id: SEC_A,
        status: "active",
        deleted_at: null,
      },
    ];
    const admin = createMockSupabaseClients({ db, tokens: {} }).admin;
    await syncSubscriptionActiveStudentCount(admin, INST_A);
    expect(db.subscription[0]!.active_student_count).toBe(1);
    expect(db.subscription[1]!.active_student_count).toBe(99);
    expect(await countBillableStudentsForInstitute(admin, INST_B)).toBe(0);
  });

  it("missing subscription stays write-locked (cross-check with headcount sync no-op)", async () => {
    const db = seedDb();
    db.subscription = [];
    db.enrollment = [
      {
        id: "e1",
        institute_id: INST_A,
        academic_year_id: YEAR_B,
        student_id: STU_1,
        class_id: CLASS_A,
        section_id: SEC_A,
        status: "active",
        deleted_at: null,
      },
    ];
    const admin = createMockSupabaseClients({ db, tokens: {} }).admin;
    const sync = await syncSubscriptionActiveStudentCount(admin, INST_A);
    expect(sync.count).toBe(1);
    expect(sync.updated).toBe(false);
    const gate = await resolveInstituteWriteGate(admin, INST_A);
    expect(gate.writeLocked).toBe(true);
    expect(gate.subscriptionMissing).toBe(true);
  });
});
