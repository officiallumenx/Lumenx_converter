import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateMarkEntryInput,
  ListMarkEntriesFilter,
  MarkEntryRow,
  MarkEntryStatus,
  MarkScoreRow,
  ScoreInput,
} from "./types.js";

const ENTRY_COLS =
  "id, institute_id, academic_year_id, class_id, section_id, exam_id, subject_id, teacher_id, max_marks, status, submitted_at, published_at, admin_note, created_at, updated_at, deleted_at";

const SCORE_COLS =
  "id, institute_id, mark_entry_id, student_id, enrollment_id, marks, created_at, updated_at, deleted_at";

export type ExamGraphRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
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

export async function findExamGraph(
  admin: SupabaseClient,
  examId: string,
): Promise<ExamGraphRow | null> {
  const result = await admin
    .from("exam")
    .select("id, institute_id, academic_year_id, deleted_at")
    .eq("id", examId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ExamGraphRow | null) ?? null;
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

export async function findEnrollmentById(
  admin: SupabaseClient,
  enrollmentId: string,
): Promise<EnrollmentRow | null> {
  const result = await admin
    .from("enrollment")
    .select(
      "id, institute_id, academic_year_id, student_id, class_id, section_id, status, deleted_at",
    )
    .eq("id", enrollmentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as EnrollmentRow | null) ?? null;
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

export async function listMarkEntries(
  admin: SupabaseClient,
  filter: ListMarkEntriesFilter,
): Promise<MarkEntryRow[]> {
  let query = admin
    .from("mark_entry")
    .select(ENTRY_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.academicYearId) query = query.eq("academic_year_id", filter.academicYearId);
  if (filter.sectionId) query = query.eq("section_id", filter.sectionId);
  if (filter.examId) query = query.eq("exam_id", filter.examId);
  if (filter.subjectId) query = query.eq("subject_id", filter.subjectId);
  if (filter.teacherId) query = query.eq("teacher_id", filter.teacherId);
  if (filter.status) query = query.eq("status", filter.status);

  const result = await query;
  return ensureDbOk(result) as MarkEntryRow[];
}

export async function findMarkEntryById(
  admin: SupabaseClient,
  id: string,
): Promise<MarkEntryRow | null> {
  const result = await admin
    .from("mark_entry")
    .select(ENTRY_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as MarkEntryRow | null) ?? null;
}

export async function listScoresForEntry(
  admin: SupabaseClient,
  markEntryId: string,
): Promise<MarkScoreRow[]> {
  const result = await admin
    .from("mark_score")
    .select(SCORE_COLS)
    .eq("mark_entry_id", markEntryId)
    .is("deleted_at", null);
  return ensureDbOk(result) as MarkScoreRow[];
}

export async function listScoresForEntryIds(
  admin: SupabaseClient,
  entryIds: string[],
): Promise<MarkScoreRow[]> {
  if (entryIds.length === 0) return [];
  const result = await admin
    .from("mark_score")
    .select(SCORE_COLS)
    .in("mark_entry_id", entryIds)
    .is("deleted_at", null);
  return ensureDbOk(result) as MarkScoreRow[];
}

export async function insertMarkEntry(
  admin: SupabaseClient,
  input: CreateMarkEntryInput & { teacherId: string },
): Promise<MarkEntryRow> {
  const result = await admin
    .from("mark_entry")
    .insert({
      institute_id: input.instituteId,
      academic_year_id: input.academicYearId,
      class_id: input.classId,
      section_id: input.sectionId,
      exam_id: input.examId,
      subject_id: input.subjectId,
      teacher_id: input.teacherId,
      max_marks: input.maxMarks,
      status: "pending",
      submitted_at: null,
      published_at: null,
      admin_note: null,
    })
    .select(ENTRY_COLS)
    .single();
  return ensureDbOk(result) as MarkEntryRow;
}

export async function updateMarkEntryFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<MarkEntryRow> {
  const result = await admin
    .from("mark_entry")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(ENTRY_COLS)
    .single();
  return ensureDbOk(result) as MarkEntryRow;
}

/**
 * Conditional status transition. Returns null when zero rows matched (race / invalid state).
 */
export async function transitionMarkEntryStatus(
  admin: SupabaseClient,
  input: {
    id: string;
    fromStatuses: MarkEntryStatus[];
    toStatus: MarkEntryStatus;
    patch: Record<string, unknown>;
  },
): Promise<MarkEntryRow | null> {
  const result = await admin
    .from("mark_entry")
    .update({ status: input.toStatus, ...input.patch })
    .eq("id", input.id)
    .in("status", input.fromStatuses)
    .is("deleted_at", null)
    .select(ENTRY_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as MarkEntryRow | null) ?? null;
}

export async function softDeleteMarkEntry(
  admin: SupabaseClient,
  id: string,
): Promise<void> {
  const result = await admin
    .from("mark_entry")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (result.error) ensureDbOk(result);
}

export async function softDeleteScoresForEntry(
  admin: SupabaseClient,
  markEntryId: string,
): Promise<void> {
  const result = await admin
    .from("mark_score")
    .update({ deleted_at: new Date().toISOString() })
    .eq("mark_entry_id", markEntryId)
    .is("deleted_at", null);
  if (result.error) ensureDbOk(result);
}

export async function insertScores(
  admin: SupabaseClient,
  entry: MarkEntryRow,
  scores: Array<ScoreInput & { studentId: string }>,
): Promise<MarkScoreRow[]> {
  if (scores.length === 0) return [];
  const result = await admin
    .from("mark_score")
    .insert(
      scores.map((s) => ({
        institute_id: entry.institute_id,
        mark_entry_id: entry.id,
        student_id: s.studentId,
        enrollment_id: s.enrollmentId,
        marks: s.marks,
      })),
    )
    .select(SCORE_COLS);
  return ensureDbOk(result) as MarkScoreRow[];
}
