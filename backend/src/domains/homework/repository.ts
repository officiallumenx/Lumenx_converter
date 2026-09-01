import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateHomeworkInput,
  HomeworkRow,
  HomeworkStatus,
  ListHomeworkFilter,
} from "./types.js";

const HOMEWORK_COLS =
  "id, institute_id, academic_year_id, class_id, section_id, subject_id, teacher_id, kind, title, description, instructions, due_date, status, published_at, attachment_asset_id, created_at, updated_at, deleted_at";

const SUBMISSION_COLS =
  "id, institute_id, homework_id, student_id, enrollment_id, status, marked_at, marked_by_user_id, created_at, updated_at, deleted_at";

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

export type TeacherAssignmentRow = {
  id: string;
  teacher_id: string;
  institute_id: string;
  academic_year_id: string;
  class_id: string;
  section_id: string;
  subject_id: string;
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

export async function findTeacherAssignmentMatch(
  admin: SupabaseClient,
  input: {
    teacherId: string;
    instituteId: string;
    academicYearId: string;
    classId: string;
    sectionId: string;
    subjectId: string;
  },
): Promise<{ id: string } | null> {
  const result = await admin
    .from("teacher_assignment")
    .select("id")
    .eq("teacher_id", input.teacherId)
    .eq("institute_id", input.instituteId)
    .eq("academic_year_id", input.academicYearId)
    .eq("class_id", input.classId)
    .eq("section_id", input.sectionId)
    .eq("subject_id", input.subjectId)
    .eq("status", "active")
    .is("deleted_at", null);
  const rows = ensureDbOk(result) as Array<{ id: string }>;
  return rows[0] ?? null;
}

export async function listActiveTeacherAssignments(
  admin: SupabaseClient,
  input: { teacherId: string; instituteId: string },
): Promise<TeacherAssignmentRow[]> {
  const result = await admin
    .from("teacher_assignment")
    .select(
      "id, teacher_id, institute_id, academic_year_id, class_id, section_id, subject_id, status, deleted_at",
    )
    .eq("teacher_id", input.teacherId)
    .eq("institute_id", input.instituteId)
    .eq("status", "active")
    .is("deleted_at", null);
  return ensureDbOk(result) as TeacherAssignmentRow[];
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

export async function listHomework(
  admin: SupabaseClient,
  filter: ListHomeworkFilter,
): Promise<HomeworkRow[]> {
  let query = admin
    .from("homework")
    .select(HOMEWORK_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.academicYearId) {
    query = query.eq("academic_year_id", filter.academicYearId);
  }
  if (filter.sectionId) query = query.eq("section_id", filter.sectionId);
  if (filter.subjectId) query = query.eq("subject_id", filter.subjectId);
  if (filter.teacherId) query = query.eq("teacher_id", filter.teacherId);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.kind) query = query.eq("kind", filter.kind);
  if (filter.dueFrom) query = query.gte("due_date", filter.dueFrom);
  if (filter.dueTo) query = query.lte("due_date", filter.dueTo);

  const result = await query;
  return ensureDbOk(result) as HomeworkRow[];
}

export async function findHomeworkById(
  admin: SupabaseClient,
  id: string,
): Promise<HomeworkRow | null> {
  const result = await admin
    .from("homework")
    .select(HOMEWORK_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as HomeworkRow | null) ?? null;
}

export async function insertHomework(
  admin: SupabaseClient,
  input: CreateHomeworkInput & { teacherId: string },
): Promise<HomeworkRow> {
  const result = await admin
    .from("homework")
    .insert({
      institute_id: input.instituteId,
      academic_year_id: input.academicYearId,
      class_id: input.classId,
      section_id: input.sectionId,
      subject_id: input.subjectId,
      teacher_id: input.teacherId,
      kind: input.kind,
      title: input.title,
      description: input.description,
      instructions: input.instructions ?? null,
      due_date: input.dueDate,
      status: "draft",
      published_at: null,
    })
    .select(HOMEWORK_COLS)
    .single();
  return ensureDbOk(result) as HomeworkRow;
}

export async function updateHomeworkFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<HomeworkRow | null> {
  const result = await admin
    .from("homework")
    .update(patch)
    .eq("id", id)
    .eq("status", "draft")
    .is("deleted_at", null)
    .select(HOMEWORK_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as HomeworkRow | null) ?? null;
}

/**
 * Conditional status transition. Returns null when zero rows matched (race / invalid state).
 */
export async function transitionHomeworkStatus(
  admin: SupabaseClient,
  input: {
    id: string;
    fromStatus: HomeworkStatus;
    toStatus: HomeworkStatus;
    patch: Record<string, unknown>;
  },
): Promise<HomeworkRow | null> {
  const result = await admin
    .from("homework")
    .update({ status: input.toStatus, ...input.patch })
    .eq("id", input.id)
    .eq("status", input.fromStatus)
    .is("deleted_at", null)
    .select(HOMEWORK_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as HomeworkRow | null) ?? null;
}

/**
 * Soft-delete. Returns null when already deleted / missing (race).
 */
export async function softDeleteHomework(
  admin: SupabaseClient,
  id: string,
): Promise<HomeworkRow | null> {
  const result = await admin
    .from("homework")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(HOMEWORK_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as HomeworkRow | null) ?? null;
}

export async function listActiveEnrollmentsForSection(
  admin: SupabaseClient,
  input: { instituteId: string; sectionId: string },
): Promise<Array<{ id: string; student_id: string; roll_no: string | null }>> {
  const result = await admin
    .from("enrollment")
    .select("id, student_id, roll_no")
    .eq("institute_id", input.instituteId)
    .eq("section_id", input.sectionId)
    .eq("status", "active")
    .is("deleted_at", null);
  return ensureDbOk(result) as Array<{
    id: string;
    student_id: string;
    roll_no: string | null;
  }>;
}

export async function insertHomeworkSubmissions(
  admin: SupabaseClient,
  rows: Array<{
    instituteId: string;
    homeworkId: string;
    studentId: string;
    enrollmentId: string;
  }>,
): Promise<void> {
  if (rows.length === 0) return;
  const result = await admin.from("homework_submission").insert(
    rows.map((row) => ({
      institute_id: row.instituteId,
      homework_id: row.homeworkId,
      student_id: row.studentId,
      enrollment_id: row.enrollmentId,
      status: "missing",
      marked_at: null,
      marked_by_user_id: null,
    })),
  );
  ensureDbOk(result);
}

export async function listSubmissionsForHomework(
  admin: SupabaseClient,
  homeworkId: string,
): Promise<import("./types.js").HomeworkSubmissionRow[]> {
  const result = await admin
    .from("homework_submission")
    .select(SUBMISSION_COLS)
    .eq("homework_id", homeworkId)
    .is("deleted_at", null);
  return ensureDbOk(result) as import("./types.js").HomeworkSubmissionRow[];
}

export async function findSubmissionById(
  admin: SupabaseClient,
  id: string,
): Promise<import("./types.js").HomeworkSubmissionRow | null> {
  const result = await admin
    .from("homework_submission")
    .select(SUBMISSION_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as import("./types.js").HomeworkSubmissionRow | null) ?? null;
}

export async function updateSubmissionStatus(
  admin: SupabaseClient,
  input: {
    id: string;
    status: import("./types.js").HomeworkSubmissionStatus;
    markedByUserId: string;
  },
): Promise<import("./types.js").HomeworkSubmissionRow | null> {
  const result = await admin
    .from("homework_submission")
    .update({
      status: input.status,
      marked_at: new Date().toISOString(),
      marked_by_user_id: input.markedByUserId,
    })
    .eq("id", input.id)
    .is("deleted_at", null)
    .select(SUBMISSION_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as import("./types.js").HomeworkSubmissionRow | null) ?? null;
}
