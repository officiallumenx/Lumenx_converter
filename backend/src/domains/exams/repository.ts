import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateExamInput,
  ExamRow,
  ExamSubjectScheduleRow,
  ExamTargetSectionRow,
  ListExamsFilter,
  SubjectScheduleInput,
  TargetSectionInput,
} from "./types.js";

const EXAM_COLS =
  "id, institute_id, academic_year_id, name, header, start_date, end_date, default_starts_at, default_ends_at, total_marks, internal_marks, external_marks, audience_scope, schedule_status, lifecycle_status, schedule_published_at, created_at, updated_at, deleted_at";

const TARGET_COLS =
  "id, institute_id, academic_year_id, class_id, exam_id, section_id, created_at, updated_at, deleted_at";

const SCHEDULE_COLS =
  "id, institute_id, exam_id, subject_id, paper_date, starts_at, ends_at, room, invigilator_teacher_id, created_at, updated_at, deleted_at";

export type AcademicYearRow = {
  id: string;
  institute_id: string;
  deleted_at: string | null;
};

export type SectionRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  class_id: string;
  deleted_at: string | null;
};

export type SubjectRow = {
  id: string;
  institute_id: string;
  deleted_at: string | null;
};

export type TeacherRow = {
  id: string;
  institute_id: string;
  status: string;
  deleted_at: string | null;
};

export type EnrollmentAudienceRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  student_id: string;
  class_id: string;
  section_id: string;
  status: string;
  deleted_at: string | null;
};

export async function findAcademicYearById(
  admin: SupabaseClient,
  id: string,
): Promise<AcademicYearRow | null> {
  const result = await admin
    .from("academic_year")
    .select("id, institute_id, deleted_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AcademicYearRow | null) ?? null;
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

export async function findSubjectById(
  admin: SupabaseClient,
  subjectId: string,
): Promise<SubjectRow | null> {
  const result = await admin
    .from("subject")
    .select("id, institute_id, deleted_at")
    .eq("id", subjectId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SubjectRow | null) ?? null;
}

export async function findTeacherById(
  admin: SupabaseClient,
  teacherId: string,
): Promise<TeacherRow | null> {
  const result = await admin
    .from("teacher")
    .select("id, institute_id, status, deleted_at")
    .eq("id", teacherId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TeacherRow | null) ?? null;
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

export async function listActiveEnrollmentsForStudents(
  admin: SupabaseClient,
  input: { instituteId: string; studentIds: string[] },
): Promise<EnrollmentAudienceRow[]> {
  if (input.studentIds.length === 0) return [];
  const result = await admin
    .from("enrollment")
    .select(
      "id, institute_id, academic_year_id, student_id, class_id, section_id, status, deleted_at",
    )
    .eq("institute_id", input.instituteId)
    .in("student_id", input.studentIds)
    .eq("status", "active")
    .is("deleted_at", null);
  return ensureDbOk(result) as EnrollmentAudienceRow[];
}

export async function listExams(
  admin: SupabaseClient,
  filter: ListExamsFilter,
): Promise<ExamRow[]> {
  let query = admin
    .from("exam")
    .select(EXAM_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.academicYearId) {
    query = query.eq("academic_year_id", filter.academicYearId);
  }
  if (filter.scheduleStatus) {
    query = query.eq("schedule_status", filter.scheduleStatus);
  }
  if (filter.lifecycleStatus) {
    query = query.eq("lifecycle_status", filter.lifecycleStatus);
  }

  const result = await query;
  return ensureDbOk(result) as ExamRow[];
}

export async function findExamById(
  admin: SupabaseClient,
  id: string,
): Promise<ExamRow | null> {
  const result = await admin
    .from("exam")
    .select(EXAM_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ExamRow | null) ?? null;
}

export async function listTargetsForExam(
  admin: SupabaseClient,
  examId: string,
): Promise<ExamTargetSectionRow[]> {
  const result = await admin
    .from("exam_target_section")
    .select(TARGET_COLS)
    .eq("exam_id", examId)
    .is("deleted_at", null);
  return ensureDbOk(result) as ExamTargetSectionRow[];
}

export async function listSchedulesForExam(
  admin: SupabaseClient,
  examId: string,
): Promise<ExamSubjectScheduleRow[]> {
  const result = await admin
    .from("exam_subject_schedule")
    .select(SCHEDULE_COLS)
    .eq("exam_id", examId)
    .is("deleted_at", null);
  return ensureDbOk(result) as ExamSubjectScheduleRow[];
}

export async function listTargetsForExamIds(
  admin: SupabaseClient,
  examIds: string[],
): Promise<ExamTargetSectionRow[]> {
  if (examIds.length === 0) return [];
  const result = await admin
    .from("exam_target_section")
    .select(TARGET_COLS)
    .in("exam_id", examIds)
    .is("deleted_at", null);
  return ensureDbOk(result) as ExamTargetSectionRow[];
}

export async function listSchedulesForExamIds(
  admin: SupabaseClient,
  examIds: string[],
): Promise<ExamSubjectScheduleRow[]> {
  if (examIds.length === 0) return [];
  const result = await admin
    .from("exam_subject_schedule")
    .select(SCHEDULE_COLS)
    .in("exam_id", examIds)
    .is("deleted_at", null);
  return ensureDbOk(result) as ExamSubjectScheduleRow[];
}

export async function insertExam(
  admin: SupabaseClient,
  input: CreateExamInput,
): Promise<ExamRow> {
  const result = await admin
    .from("exam")
    .insert({
      institute_id: input.instituteId,
      academic_year_id: input.academicYearId,
      name: input.name,
      header: input.header,
      start_date: input.startDate,
      end_date: input.endDate,
      default_starts_at: input.defaultStartsAt,
      default_ends_at: input.defaultEndsAt,
      total_marks: input.totalMarks,
      internal_marks: input.internalMarks ?? null,
      external_marks: input.externalMarks ?? null,
      audience_scope: input.audienceScope,
      schedule_status: "draft",
      lifecycle_status: "open",
      schedule_published_at: null,
    })
    .select(EXAM_COLS)
    .single();
  return ensureDbOk(result) as ExamRow;
}

export async function updateExamFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<ExamRow> {
  const result = await admin
    .from("exam")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(EXAM_COLS)
    .single();
  return ensureDbOk(result) as ExamRow;
}

export async function softDeleteExam(
  admin: SupabaseClient,
  id: string,
): Promise<void> {
  const now = new Date().toISOString();
  const result = await admin
    .from("exam")
    .update({ deleted_at: now })
    .eq("id", id)
    .is("deleted_at", null);
  if (result.error) ensureDbOk(result);
}

export async function softDeleteTargetsForExam(
  admin: SupabaseClient,
  examId: string,
): Promise<void> {
  const result = await admin
    .from("exam_target_section")
    .update({ deleted_at: new Date().toISOString() })
    .eq("exam_id", examId)
    .is("deleted_at", null);
  if (result.error) ensureDbOk(result);
}

export async function softDeleteSchedulesForExam(
  admin: SupabaseClient,
  examId: string,
): Promise<void> {
  const result = await admin
    .from("exam_subject_schedule")
    .update({ deleted_at: new Date().toISOString() })
    .eq("exam_id", examId)
    .is("deleted_at", null);
  if (result.error) ensureDbOk(result);
}

export async function insertTargets(
  admin: SupabaseClient,
  exam: ExamRow,
  targets: TargetSectionInput[],
): Promise<ExamTargetSectionRow[]> {
  if (targets.length === 0) return [];
  const result = await admin
    .from("exam_target_section")
    .insert(
      targets.map((t) => ({
        institute_id: exam.institute_id,
        academic_year_id: exam.academic_year_id,
        class_id: t.classId,
        exam_id: exam.id,
        section_id: t.sectionId,
      })),
    )
    .select(TARGET_COLS);
  return ensureDbOk(result) as ExamTargetSectionRow[];
}

export async function insertSchedules(
  admin: SupabaseClient,
  exam: ExamRow,
  schedules: SubjectScheduleInput[],
): Promise<ExamSubjectScheduleRow[]> {
  if (schedules.length === 0) return [];
  const result = await admin
    .from("exam_subject_schedule")
    .insert(
      schedules.map((s) => ({
        institute_id: exam.institute_id,
        exam_id: exam.id,
        subject_id: s.subjectId,
        paper_date: s.paperDate,
        starts_at: s.startsAt,
        ends_at: s.endsAt,
        room: s.room ?? null,
        invigilator_teacher_id: s.invigilatorTeacherId ?? null,
      })),
    )
    .select(SCHEDULE_COLS);
  return ensureDbOk(result) as ExamSubjectScheduleRow[];
}
