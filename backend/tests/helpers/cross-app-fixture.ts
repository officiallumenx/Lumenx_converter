/**
 * Shared synthetic multi-actor fixture for cross-app data-sharing lifecycle tests.
 * All IDs are fixed UUIDs — never real personal data.
 */
import { createApp } from "../../src/app.js";
import { loadEnv } from "../../src/config/env.js";
import { createLogger } from "../../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./mock-supabase.js";
import { ensureWritableTrials } from "./subscription-fixture.js";

export const silentLogger = createLogger("error");

export const IDS = {
  USER_ADMIN: "11111111-1111-4111-8111-111111111111",
  USER_ADMIN_B: "11111111-2222-4111-8111-111111111111",
  USER_TEACHER: "22222222-2222-4222-8222-222222222222",
  USER_TEACHER_B: "66666666-6666-4666-8666-666666666666",
  USER_STUDENT: "33333333-3333-4333-8333-333333333333",
  USER_STUDENT_B: "77777777-7777-4777-8777-777777777777",
  USER_PARENT: "55555555-5555-4555-8555-555555555555",
  USER_PARENT_B: "88888888-8888-4888-8888-888888888888",
  INST_A: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  INST_B: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  MEMBER_ADMIN: "aa111111-1111-4111-8111-111111111111",
  MEMBER_ADMIN_B: "aa111111-2222-4111-8111-111111111111",
  MEMBER_TEACHER: "aa222222-2222-4222-8222-222222222222",
  MEMBER_TEACHER_B: "aa666666-6666-4666-8666-666666666666",
  MEMBER_STUDENT: "aa333333-3333-4333-8333-333333333333",
  MEMBER_STUDENT_B: "aa777777-7777-4777-8777-777777777777",
  MEMBER_PARENT: "aa555555-5555-4555-8555-555555555555",
  MEMBER_PARENT_B: "aa888888-8888-4888-8888-888888888888",
  TEACHER_A: "bb111111-1111-4111-8111-111111111111",
  TEACHER_B: "bb222222-2222-4222-8222-222222222222",
  PARENT_A: "ba111111-1111-4111-8111-111111111111",
  PARENT_B: "ba222222-2222-4222-8222-222222222222",
  STUDENT_A: "ac111111-1111-4111-8111-111111111111",
  STUDENT_B: "ac222222-2222-4222-8222-222222222222",
  YEAR_A: "ee111111-1111-4111-8111-111111111111",
  YEAR_B: "ee222222-2222-4222-8222-222222222222",
  CLASS_A: "ff111111-1111-4111-8111-111111111111",
  CLASS_C: "ff333333-3333-4333-8333-333333333333",
  CLASS_B: "ff222222-2222-4222-8222-222222222222",
  SECTION_A: "cc111111-1111-4111-8111-111111111111",
  SECTION_C: "cc333333-3333-4333-8333-333333333333",
  SECTION_B: "cc222222-2222-4222-8222-222222222222",
  SUBJECT_A: "dd111111-1111-4111-8111-111111111111",
  SUBJECT_B: "dd222222-2222-4222-8222-222222222222",
  ASSIGN_A: "ab111111-1111-4111-8111-111111111111",
  ASSIGN_B: "ab222222-2222-4222-8222-222222222222",
  ENROLL_A: "ad111111-1111-4111-8111-111111111111",
  ENROLL_B: "ad222222-2222-4222-8222-222222222222",
  CONFIG_A: "ae111111-1111-4111-8111-111111111111",
  EXAM_A: "af111111-1111-4111-8111-111111111111",
  ENTRY_PENDING: "b0111111-1111-4111-8111-111111111111",
  SCORE_A: "b0333333-3333-4333-8333-333333333333",
  HW_DRAFT: "c0111111-1111-4111-8111-111111111111",
  PLAN_A: "d0111111-1111-4111-8111-111111111111",
  COMP_A: "d0222222-2222-4222-8222-222222222222",
  SLOT_INACTIVE: "e0111111-1111-4111-8111-111111111111",
  SLOT_ACTIVE: "e0222222-2222-4222-8222-222222222222",
  TPL_CERT: "f0111111-1111-4111-8111-111111111111",
  ISSUED_A: "f0222222-2222-4222-8222-222222222222",
  VEHICLE_A: "a0111111-1111-4111-8111-111111111111",
  ROUTE_A: "a0222222-2222-4222-8222-222222222222",
  STOP_PICKUP: "a0333333-3333-4333-8333-333333333333",
  STOP_DROP: "a0444444-4444-4444-8444-444444444444",
  T_ENROLL_A: "a0555555-5555-4555-8555-555555555555",
  ANN_DRAFT: "a0666666-6666-4666-8666-666666666666",
} as const;

export const TOKENS = {
  "token-admin": IDS.USER_ADMIN,
  "token-admin-b": IDS.USER_ADMIN_B,
  "token-teacher": IDS.USER_TEACHER,
  "token-teacher-b": IDS.USER_TEACHER_B,
  "token-student": IDS.USER_STUDENT,
  "token-student-b": IDS.USER_STUDENT_B,
  "token-parent": IDS.USER_PARENT,
  "token-parent-b": IDS.USER_PARENT_B,
} as const;

export function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export function jsonHeaders(token: string): Record<string, string> {
  return { ...auth(token), "Content-Type": "application/json" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function json(res: Response): Promise<any> {
  return res.json();
}

/** Minimal shared world: two institutes, two sections in A, linked parents, assignments. */
export function crossAppDb(): MockDb {
  const {
    USER_ADMIN,
    USER_ADMIN_B,
    USER_TEACHER,
    USER_TEACHER_B,
    USER_STUDENT,
    USER_STUDENT_B,
    USER_PARENT,
    USER_PARENT_B,
    INST_A,
    INST_B,
    MEMBER_ADMIN,
    MEMBER_ADMIN_B,
    MEMBER_TEACHER,
    MEMBER_TEACHER_B,
    MEMBER_STUDENT,
    MEMBER_STUDENT_B,
    MEMBER_PARENT,
    MEMBER_PARENT_B,
    TEACHER_A,
    TEACHER_B,
    PARENT_A,
    PARENT_B,
    STUDENT_A,
    STUDENT_B,
    YEAR_A,
    YEAR_B,
    CLASS_A,
    CLASS_C,
    CLASS_B,
    SECTION_A,
    SECTION_C,
    SECTION_B,
    SUBJECT_A,
    SUBJECT_B,
    ASSIGN_A,
    ASSIGN_B,
    ENROLL_A,
    ENROLL_B,
    CONFIG_A,
    EXAM_A,
    ENTRY_PENDING,
    SCORE_A,
    HW_DRAFT,
    PLAN_A,
    COMP_A,
    SLOT_INACTIVE,
    SLOT_ACTIVE,
    TPL_CERT,
    ISSUED_A,
  } = IDS;

  const db = emptyMockDb();
  db.institute = [
    { id: INST_A, code: "A", name: "Institute A", kind: "school", status: "active", deleted_at: null },
    { id: INST_B, code: "B", name: "Institute B", kind: "school", status: "active", deleted_at: null },
  ];
  db.user_profile = [
    { id: USER_ADMIN, display_name: "Admin A", email: "admin-a@example.test", status: "active", deleted_at: null },
    { id: USER_ADMIN_B, display_name: "Admin B", email: "admin-b@example.test", status: "active", deleted_at: null },
    { id: USER_TEACHER, display_name: "Teacher A", email: "teacher-a@example.test", status: "active", deleted_at: null },
    { id: USER_TEACHER_B, display_name: "Teacher B", email: "teacher-b@example.test", status: "active", deleted_at: null },
    { id: USER_STUDENT, display_name: "Student A", email: "student-a@example.test", status: "active", deleted_at: null },
    { id: USER_STUDENT_B, display_name: "Student B", email: "student-b@example.test", status: "active", deleted_at: null },
    { id: USER_PARENT, display_name: "Parent A", email: "parent-a@example.test", status: "active", deleted_at: null },
    { id: USER_PARENT_B, display_name: "Parent B", email: "parent-b@example.test", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_ADMIN_B, user_id: USER_ADMIN_B, institute_id: INST_B, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER_B, user_id: USER_TEACHER_B, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_STUDENT, user_id: USER_STUDENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_STUDENT_B, user_id: USER_STUDENT_B, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_PARENT, user_id: USER_PARENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_PARENT_B, user_id: USER_PARENT_B, institute_id: INST_A, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_ADMIN_B, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_TEACHER_B, role_code: "teacher" },
    { membership_id: MEMBER_STUDENT, role_code: "student" },
    { membership_id: MEMBER_STUDENT_B, role_code: "student" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
    { membership_id: MEMBER_PARENT_B, role_code: "parent" },
  ];
  db.teacher = [
    { id: TEACHER_A, institute_id: INST_A, user_profile_id: USER_TEACHER, display_name: "Teacher A", status: "active", deleted_at: null },
    { id: TEACHER_B, institute_id: INST_A, user_profile_id: USER_TEACHER_B, display_name: "Teacher B", status: "active", deleted_at: null },
  ];
  db.parent = [
    { id: PARENT_A, institute_id: INST_A, user_profile_id: USER_PARENT, deleted_at: null },
    { id: PARENT_B, institute_id: INST_A, user_profile_id: USER_PARENT_B, deleted_at: null },
  ];
  db.student = [
    {
      id: STUDENT_A,
      institute_id: INST_A,
      user_profile_id: USER_STUDENT,
      display_name: "Student A",
      first_name: "Student",
      surname: "A",
      class_label: "10",
      section_label: "A",
      roll_no: "1",
      deleted_at: null,
    },
    {
      id: STUDENT_B,
      institute_id: INST_A,
      user_profile_id: USER_STUDENT_B,
      display_name: "Student B",
      first_name: "Student",
      surname: "B",
      class_label: "9",
      section_label: "B",
      roll_no: "2",
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
    {
      id: "bc222222-2222-4222-8222-222222222222",
      institute_id: INST_A,
      student_id: STUDENT_B,
      parent_id: PARENT_B,
      relationship: "mother",
      is_primary: true,
      status: "active",
      deleted_at: null,
    },
  ];
  db.academic_year = [
    { id: YEAR_A, institute_id: INST_A, label: "2026-27", status: "active", deleted_at: null },
    { id: YEAR_B, institute_id: INST_B, label: "2026-27", status: "active", deleted_at: null },
  ];
  db.class = [
    { id: CLASS_A, institute_id: INST_A, academic_year_id: YEAR_A, name: "10", deleted_at: null },
    { id: CLASS_C, institute_id: INST_A, academic_year_id: YEAR_A, name: "9", deleted_at: null },
    { id: CLASS_B, institute_id: INST_B, academic_year_id: YEAR_B, name: "10", deleted_at: null },
  ];
  db.section = [
    {
      id: SECTION_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      name: "A",
      class_teacher_id: TEACHER_A,
      deleted_at: null,
    },
    {
      id: SECTION_C,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_C,
      name: "B",
      class_teacher_id: TEACHER_B,
      deleted_at: null,
    },
    {
      id: SECTION_B,
      institute_id: INST_B,
      academic_year_id: YEAR_B,
      class_id: CLASS_B,
      name: "A",
      deleted_at: null,
    },
  ];
  db.subject = [
    { id: SUBJECT_A, institute_id: INST_A, name: "Math", deleted_at: null },
    { id: SUBJECT_B, institute_id: INST_B, name: "Math", deleted_at: null },
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
      roll_no: "1",
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
      roll_no: "2",
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
      total_marks: 100,
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
  ];
  db.mark_entry = [
    {
      id: ENTRY_PENDING,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      exam_id: EXAM_A,
      section_id: SECTION_A,
      subject_id: SUBJECT_A,
      teacher_id: TEACHER_A,
      max_marks: 100,
      status: "pending",
      submitted_at: null,
      published_at: null,
      admin_note: null,
      created_at: "2026-08-02T00:00:00.000Z",
      updated_at: "2026-08-02T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.mark_score = [
    {
      id: SCORE_A,
      institute_id: INST_A,
      mark_entry_id: ENTRY_PENDING,
      student_id: STUDENT_A,
      enrollment_id: ENROLL_A,
      marks: 88,
      internal_marks: 40,
      external_marks: 48,
      created_at: "2026-08-02T00:00:00.000Z",
      updated_at: "2026-08-02T00:00:00.000Z",
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
      title: "Draft Cross-App HW",
      description: "Lifecycle draft",
      instructions: null,
      due_date: "2026-09-20",
      status: "draft",
      published_at: null,
      attachment_asset_id: null,
      created_at: "2026-08-02T00:00:00.000Z",
      updated_at: "2026-08-02T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.fee_plan = [
    {
      id: PLAN_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      status: "draft",
      publish_scope: "institute",
      published_class_ids: [],
      published_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.fee_component = [
    {
      id: COMP_A,
      institute_id: INST_A,
      fee_plan_id: PLAN_A,
      kind: "tuition",
      name: "Tuition",
      active: true,
      assigned_to_all: true,
      assigned_class_ids: [],
      class_amounts: { [CLASS_A]: 10000 },
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.timetable_slot = [
    {
      id: SLOT_INACTIVE,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      section_id: SECTION_A,
      class_id: CLASS_A,
      subject_id: SUBJECT_A,
      teacher_id: TEACHER_A,
      weekday: 1,
      period_index: 1,
      starts_at: "09:00:00",
      ends_at: "09:45:00",
      status: "inactive",
      deleted_at: null,
    },
    {
      id: SLOT_ACTIVE,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      section_id: SECTION_A,
      class_id: CLASS_A,
      subject_id: SUBJECT_A,
      teacher_id: TEACHER_A,
      weekday: 2,
      period_index: 1,
      starts_at: "09:00:00",
      ends_at: "09:45:00",
      status: "active",
      deleted_at: null,
    },
  ];
  db.template = [
    {
      id: TPL_CERT,
      institute_id: INST_A,
      document_type: "certificate",
      name: "Merit",
      status: "published",
      portal_student: true,
      portal_parent: true,
      portal_teacher: false,
      deleted_at: null,
    },
  ];
  db.issued_certificate = [
    {
      id: ISSUED_A,
      institute_id: INST_A,
      template_id: TPL_CERT,
      student_id: STUDENT_A,
      recipient_name: "Student A",
      title: "Merit",
      year: 2026,
      certificate_number: "CERT/2026/0001",
      status: "issued",
      issued_at: "2026-08-01T00:00:00.000Z",
      issued_by_user_id: USER_ADMIN,
      deleted_at: null,
    },
  ];
  const {
    VEHICLE_A,
    ROUTE_A,
    STOP_PICKUP,
    STOP_DROP,
    T_ENROLL_A,
    ANN_DRAFT,
  } = IDS;
  db.vehicle = [
    {
      id: VEHICLE_A,
      institute_id: INST_A,
      vehicle_number: "BUS-1",
      registration_number: "KA01AB1234",
      capacity: 40,
      status: "active",
      notes: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.route = [
    {
      id: ROUTE_A,
      institute_id: INST_A,
      name: "North Loop",
      vehicle_id: VEHICLE_A,
      driver_id: null,
      status: "active",
      config_status: "configured",
      locked_at: null,
      locked_by_user_id: null,
      setup_finished_at: null,
      approval_status: "approved",
      submitted_by_user_id: null,
      reviewed_by_user_id: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.stop = [
    {
      id: STOP_PICKUP,
      institute_id: INST_A,
      route_id: ROUTE_A,
      name: "Gate A",
      location_label: "Main Gate",
      latitude: 12.97,
      longitude: 77.59,
      route_order: 0,
      notification_radius_m: 150,
      approval_status: "approved",
      submitted_by_user_id: null,
      reviewed_by_user_id: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: STOP_DROP,
      institute_id: INST_A,
      route_id: ROUTE_A,
      name: "School",
      location_label: "Campus",
      latitude: 12.98,
      longitude: 77.6,
      route_order: 1,
      notification_radius_m: 150,
      approval_status: "approved",
      submitted_by_user_id: null,
      reviewed_by_user_id: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.transport_enrollment = [
    {
      id: T_ENROLL_A,
      institute_id: INST_A,
      student_id: STUDENT_A,
      route_id: ROUTE_A,
      pickup_stop_id: STOP_PICKUP,
      drop_stop_id: STOP_DROP,
      status: "active",
      approval_status: "approved",
      submitted_by_user_id: null,
      reviewed_by_user_id: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.announcement = [
    {
      id: ANN_DRAFT,
      institute_id: INST_A,
      title: "Draft cross-app notice",
      body: "Hidden until publish",
      audience_scope: "all",
      audience_label: "All",
      audience_class_ids: [],
      audience_section_ids: [],
      audience_activity_ids: [],
      status: "draft",
      scheduled_at: null,
      published_at: null,
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  ensureWritableTrials(db, [INST_A, INST_B]);
  return db;
}

export function appWithCrossAppDb(db: MockDb = crossAppDb()) {
  const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
  return createApp(
    env,
    silentLogger,
    createMockSupabaseClients({ tokens: { ...TOKENS }, db }),
  );
}
