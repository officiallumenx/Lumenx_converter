import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  AttendanceConfigVersionRow,
  AttendanceMarkRow,
  AttendanceMarkStatus,
  AttendanceRegisterRow,
  CreateConfigInput,
  CreateRegisterInput,
  ListRegistersFilter,
} from "./types.js";

const CONFIG_COLS =
  "id, institute_id, effective_from, method, owner, scope, class_codes, section_codes, created_by_user_profile_id, created_at, updated_at, deleted_at";

const REGISTER_COLS =
  "id, institute_id, academic_year_id, class_id, section_id, config_version_id, method, owner, attendance_date, slot_kind, slot_code, period_index, timetable_slot_id, slot_label, subject_label, starts_at, ends_at, status, marked_by_teacher_id, submitted_at, created_at, updated_at, deleted_at";

const MARK_COLS =
  "id, institute_id, register_id, student_id, enrollment_id, status, created_at, updated_at, deleted_at";

export type EnrollmentRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  student_id: string;
  class_id: string;
  section_id: string;
  status: string;
  deleted_at: string | null;
};

export type SectionRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  class_id: string;
  deleted_at: string | null;
};

export type TimetableSlotGraphRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  class_id: string;
  section_id: string;
  teacher_assignment_id: string;
  deleted_at: string | null;
};

export async function listConfigVersions(
  admin: SupabaseClient,
  instituteId: string,
): Promise<AttendanceConfigVersionRow[]> {
  const result = await admin
    .from("attendance_config_version")
    .select(CONFIG_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as AttendanceConfigVersionRow[];
}

export async function findConfigVersionById(
  admin: SupabaseClient,
  id: string,
): Promise<AttendanceConfigVersionRow | null> {
  const result = await admin
    .from("attendance_config_version")
    .select(CONFIG_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AttendanceConfigVersionRow | null) ?? null;
}

export async function insertConfigVersion(
  admin: SupabaseClient,
  input: CreateConfigInput & { createdByUserProfileId: string | null },
): Promise<AttendanceConfigVersionRow> {
  const result = await admin
    .from("attendance_config_version")
    .insert({
      institute_id: input.instituteId,
      effective_from: input.effectiveFrom,
      method: input.method,
      owner: input.owner,
      scope: input.scope,
      class_codes: input.classCodes ?? [],
      section_codes: input.sectionCodes ?? [],
      created_by_user_profile_id: input.createdByUserProfileId,
    })
    .select(CONFIG_COLS)
    .single();
  return ensureDbOk(result) as AttendanceConfigVersionRow;
}

export async function listRegisters(
  admin: SupabaseClient,
  filter: ListRegistersFilter,
): Promise<AttendanceRegisterRow[]> {
  let query = admin
    .from("attendance_register")
    .select(REGISTER_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.academicYearId) {
    query = query.eq("academic_year_id", filter.academicYearId);
  }
  if (filter.sectionId) {
    query = query.eq("section_id", filter.sectionId);
  }
  if (filter.attendanceDate) {
    query = query.eq("attendance_date", filter.attendanceDate);
  }
  if (filter.status) {
    query = query.eq("status", filter.status);
  }

  const result = await query;
  return ensureDbOk(result) as AttendanceRegisterRow[];
}

export async function findRegisterById(
  admin: SupabaseClient,
  id: string,
): Promise<AttendanceRegisterRow | null> {
  const result = await admin
    .from("attendance_register")
    .select(REGISTER_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AttendanceRegisterRow | null) ?? null;
}

export async function insertRegister(
  admin: SupabaseClient,
  input: CreateRegisterInput & {
    method: string;
    owner: string;
    markedByTeacherId: string | null;
  },
): Promise<AttendanceRegisterRow> {
  const result = await admin
    .from("attendance_register")
    .insert({
      institute_id: input.instituteId,
      academic_year_id: input.academicYearId,
      class_id: input.classId,
      section_id: input.sectionId,
      config_version_id: input.configVersionId,
      method: input.method,
      owner: input.owner,
      attendance_date: input.attendanceDate,
      slot_kind: input.slotKind,
      slot_code: input.slotCode,
      period_index: input.periodIndex ?? null,
      timetable_slot_id: input.timetableSlotId ?? null,
      slot_label: input.slotLabel,
      subject_label: input.subjectLabel ?? null,
      starts_at: input.startsAt ?? null,
      ends_at: input.endsAt ?? null,
      status: "draft",
      marked_by_teacher_id: input.markedByTeacherId,
      submitted_at: null,
    })
    .select(REGISTER_COLS)
    .single();
  return ensureDbOk(result) as AttendanceRegisterRow;
}

export async function updateRegisterDraftFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<AttendanceRegisterRow> {
  const result = await admin
    .from("attendance_register")
    .update(patch)
    .eq("id", id)
    .eq("status", "draft")
    .is("deleted_at", null)
    .select(REGISTER_COLS)
    .single();
  return ensureDbOk(result) as AttendanceRegisterRow;
}

/**
 * Conditionally submit a draft register.
 * Returns null when no draft row matched (already submitted / deleted / race).
 */
export async function submitRegister(
  admin: SupabaseClient,
  id: string,
  submittedAt: string,
): Promise<AttendanceRegisterRow | null> {
  const result = await admin
    .from("attendance_register")
    .update({ status: "submitted", submitted_at: submittedAt })
    .eq("id", id)
    .eq("status", "draft")
    .is("deleted_at", null)
    .select(REGISTER_COLS)
    .maybeSingle();
  if (result.error) {
    ensureDbOk(result);
  }
  return (result.data as AttendanceRegisterRow | null) ?? null;
}

export async function listMarksForRegister(
  admin: SupabaseClient,
  registerId: string,
): Promise<AttendanceMarkRow[]> {
  const result = await admin
    .from("attendance_mark")
    .select(MARK_COLS)
    .eq("register_id", registerId)
    .is("deleted_at", null);
  return ensureDbOk(result) as AttendanceMarkRow[];
}

export async function listMarksForInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<AttendanceMarkRow[]> {
  const result = await admin
    .from("attendance_mark")
    .select(MARK_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as AttendanceMarkRow[];
}

export async function softDeleteMarksForRegister(
  admin: SupabaseClient,
  registerId: string,
): Promise<void> {
  const result = await admin
    .from("attendance_mark")
    .update({ deleted_at: new Date().toISOString() })
    .eq("register_id", registerId)
    .is("deleted_at", null);
  if (result.error) ensureDbOk(result);
}

export async function insertMarks(
  admin: SupabaseClient,
  rows: Array<{
    instituteId: string;
    registerId: string;
    studentId: string;
    enrollmentId: string;
    status: AttendanceMarkStatus;
  }>,
): Promise<AttendanceMarkRow[]> {
  if (rows.length === 0) return [];
  const result = await admin
    .from("attendance_mark")
    .insert(
      rows.map((r) => ({
        institute_id: r.instituteId,
        register_id: r.registerId,
        student_id: r.studentId,
        enrollment_id: r.enrollmentId,
        status: r.status,
      })),
    )
    .select(MARK_COLS);
  return ensureDbOk(result) as AttendanceMarkRow[];
}

export async function findSectionById(
  admin: SupabaseClient,
  sectionId: string,
): Promise<SectionRow | null> {
  const result = await admin
    .from("section")
    .select("id, institute_id, academic_year_id, class_id, deleted_at")
    .eq("id", sectionId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SectionRow | null) ?? null;
}

export async function findEnrollmentsByIds(
  admin: SupabaseClient,
  enrollmentIds: string[],
): Promise<EnrollmentRow[]> {
  if (enrollmentIds.length === 0) return [];
  const result = await admin
    .from("enrollment")
    .select(
      "id, institute_id, academic_year_id, student_id, class_id, section_id, status, deleted_at",
    )
    .in("id", enrollmentIds)
    .is("deleted_at", null);
  return ensureDbOk(result) as EnrollmentRow[];
}

export async function findTimetableSlotGraph(
  admin: SupabaseClient,
  slotId: string,
): Promise<TimetableSlotGraphRow | null> {
  const result = await admin
    .from("timetable_slot")
    .select(
      "id, institute_id, academic_year_id, class_id, section_id, teacher_assignment_id, deleted_at",
    )
    .eq("id", slotId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TimetableSlotGraphRow | null) ?? null;
}

/** Active assignment for teacher on the section academic graph (any subject). */
export async function findTeacherSectionAssignment(
  admin: SupabaseClient,
  input: {
    teacherId: string;
    instituteId: string;
    sectionId: string;
    academicYearId: string;
    classId: string;
  },
): Promise<{ id: string } | null> {
  const result = await admin
    .from("teacher_assignment")
    .select("id")
    .eq("teacher_id", input.teacherId)
    .eq("institute_id", input.instituteId)
    .eq("section_id", input.sectionId)
    .eq("academic_year_id", input.academicYearId)
    .eq("class_id", input.classId)
    .eq("status", "active")
    .is("deleted_at", null);
  const rows = ensureDbOk(result) as Array<{ id: string }>;
  return rows[0] ?? null;
}

export async function listGuardianStudentIds(
  admin: SupabaseClient,
  parentId: string,
): Promise<string[]> {
  const result = await admin
    .from("guardian_link")
    .select("student_id")
    .eq("parent_id", parentId)
    .eq("status", "active")
    .is("deleted_at", null);
  const rows = ensureDbOk(result) as Array<{ student_id: string }>;
  return rows.map((r) => r.student_id);
}
