import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateDiaryDayInput,
  DiaryDayRecord,
  DiaryDayRowInput,
  DiaryDayRowRecord,
  ListDiaryFilter,
} from "./types.js";

const DAY_COLS =
  "id, institute_id, academic_year_id, teacher_id, diary_date, scope, submitted_at, created_at, updated_at, deleted_at";

const ROW_COLS =
  "id, institute_id, diary_day_id, section_id, class_label, description, sort_order, created_at, updated_at, deleted_at";

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

export type TeacherAssignmentRow = {
  id: string;
  teacher_id: string;
  institute_id: string;
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

export async function listActiveTeacherAssignmentsForSections(
  admin: SupabaseClient,
  input: { teacherId: string; instituteId: string },
): Promise<TeacherAssignmentRow[]> {
  const result = await admin
    .from("teacher_assignment")
    .select("id, teacher_id, institute_id, section_id, status, deleted_at")
    .eq("teacher_id", input.teacherId)
    .eq("institute_id", input.instituteId)
    .eq("status", "active")
    .is("deleted_at", null);
  return ensureDbOk(result) as TeacherAssignmentRow[];
}

export async function listDiaryDays(
  admin: SupabaseClient,
  filter: ListDiaryFilter,
): Promise<DiaryDayRecord[]> {
  let query = admin
    .from("diary_day")
    .select(DAY_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.teacherId) query = query.eq("teacher_id", filter.teacherId);
  if (filter.academicYearId) {
    query = query.eq("academic_year_id", filter.academicYearId);
  }
  if (filter.scope) query = query.eq("scope", filter.scope);
  if (filter.diaryDate) query = query.eq("diary_date", filter.diaryDate);
  if (filter.dateFrom) query = query.gte("diary_date", filter.dateFrom);
  if (filter.dateTo) query = query.lte("diary_date", filter.dateTo);
  if (filter.submitted === true) query = query.not("submitted_at", "is", null);
  if (filter.submitted === false) query = query.is("submitted_at", null);

  const result = await query;
  return ensureDbOk(result) as DiaryDayRecord[];
}

export async function findDiaryDayById(
  admin: SupabaseClient,
  id: string,
): Promise<DiaryDayRecord | null> {
  const result = await admin
    .from("diary_day")
    .select(DAY_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as DiaryDayRecord | null) ?? null;
}

export async function listRowsForDay(
  admin: SupabaseClient,
  diaryDayId: string,
): Promise<DiaryDayRowRecord[]> {
  const result = await admin
    .from("diary_day_row")
    .select(ROW_COLS)
    .eq("diary_day_id", diaryDayId)
    .is("deleted_at", null);
  const rows = ensureDbOk(result) as DiaryDayRowRecord[];
  return rows.sort((a, b) => a.sort_order - b.sort_order);
}

export async function listRowsForDayIds(
  admin: SupabaseClient,
  dayIds: string[],
): Promise<DiaryDayRowRecord[]> {
  if (dayIds.length === 0) return [];
  const result = await admin
    .from("diary_day_row")
    .select(ROW_COLS)
    .in("diary_day_id", dayIds)
    .is("deleted_at", null);
  return ensureDbOk(result) as DiaryDayRowRecord[];
}

export async function insertDiaryDay(
  admin: SupabaseClient,
  input: CreateDiaryDayInput & { teacherId: string },
): Promise<DiaryDayRecord> {
  const result = await admin
    .from("diary_day")
    .insert({
      institute_id: input.instituteId,
      academic_year_id: input.academicYearId ?? null,
      teacher_id: input.teacherId,
      diary_date: input.diaryDate,
      scope: input.scope,
      submitted_at: null,
    })
    .select(DAY_COLS)
    .single();
  return ensureDbOk(result) as DiaryDayRecord;
}

export async function updateDiaryDayFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<DiaryDayRecord | null> {
  const result = await admin
    .from("diary_day")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(DAY_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as DiaryDayRecord | null) ?? null;
}

/**
 * Soft-delete live rows for a day, then insert the replacement set.
 */
export async function replaceDiaryRows(
  admin: SupabaseClient,
  day: DiaryDayRecord,
  rows: DiaryDayRowInput[],
): Promise<DiaryDayRowRecord[]> {
  const soft = await admin
    .from("diary_day_row")
    .update({ deleted_at: new Date().toISOString() })
    .eq("diary_day_id", day.id)
    .is("deleted_at", null);
  if (soft.error) ensureDbOk(soft);

  if (rows.length === 0) return [];

  const result = await admin
    .from("diary_day_row")
    .insert(
      rows.map((r, index) => ({
        institute_id: day.institute_id,
        diary_day_id: day.id,
        section_id: r.sectionId ?? null,
        class_label: r.classLabel,
        description: r.description,
        sort_order: r.sortOrder ?? index,
      })),
    )
    .select(ROW_COLS);
  return ensureDbOk(result) as DiaryDayRowRecord[];
}

export async function softDeleteDiaryDay(
  admin: SupabaseClient,
  id: string,
): Promise<DiaryDayRecord | null> {
  const now = new Date().toISOString();
  const rowsResult = await admin
    .from("diary_day_row")
    .update({ deleted_at: now })
    .eq("diary_day_id", id)
    .is("deleted_at", null);
  if (rowsResult.error) ensureDbOk(rowsResult);

  const result = await admin
    .from("diary_day")
    .update({ deleted_at: now })
    .eq("id", id)
    .is("deleted_at", null)
    .select(DAY_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as DiaryDayRecord | null) ?? null;
}
