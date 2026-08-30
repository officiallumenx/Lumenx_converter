import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateTimetableSlotInput,
  ListTimetableSlotsFilter,
  TimetableSlotRow,
  UpdateTimetableSlotInput,
} from "./types.js";

type AssignmentGraphRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  status: string;
  deleted_at: string | null;
};

type SectionRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  class_id: string;
  deleted_at: string | null;
};

const SLOT_COLUMNS =
  "id, institute_id, academic_year_id, class_id, section_id, teacher_assignment_id, day_of_week, period_index, starts_at, ends_at, room, status, created_at, updated_at, deleted_at";

export async function findTimetableSlotById(
  admin: SupabaseClient,
  id: string,
): Promise<TimetableSlotRow | null> {
  const result = await admin
    .from("timetable_slot")
    .select(SLOT_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (result.error) {
    ensureDbOk(result);
  }
  return (result.data as TimetableSlotRow | null) ?? null;
}

export async function listTimetableSlots(
  admin: SupabaseClient,
  filter: ListTimetableSlotsFilter,
  assignmentIds?: string[],
): Promise<TimetableSlotRow[]> {
  let query = admin
    .from("timetable_slot")
    .select(SLOT_COLUMNS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.academicYearId) {
    query = query.eq("academic_year_id", filter.academicYearId);
  }
  if (filter.sectionId) {
    query = query.eq("section_id", filter.sectionId);
  }
  if (assignmentIds) {
    if (assignmentIds.length === 0) {
      return [];
    }
    query = query.in("teacher_assignment_id", assignmentIds);
  }

  const result = await query;
  return ensureDbOk(result) as TimetableSlotRow[];
}

export async function findAssignmentIdsForTeacher(
  admin: SupabaseClient,
  input: { instituteId: string; teacherId: string; academicYearId?: string },
): Promise<string[]> {
  let query = admin
    .from("teacher_assignment")
    .select("id")
    .eq("institute_id", input.instituteId)
    .eq("teacher_id", input.teacherId)
    .eq("status", "active")
    .is("deleted_at", null);

  if (input.academicYearId) {
    query = query.eq("academic_year_id", input.academicYearId);
  }

  const result = await query;
  const rows = ensureDbOk(result) as Array<{ id: string }>;
  return rows.map((r) => r.id);
}

export async function findActiveAssignmentById(
  admin: SupabaseClient,
  assignmentId: string,
): Promise<AssignmentGraphRow | null> {
  const result = await admin
    .from("teacher_assignment")
    .select(
      "id, institute_id, academic_year_id, class_id, section_id, subject_id, teacher_id, status, deleted_at",
    )
    .eq("id", assignmentId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (result.error) {
    ensureDbOk(result);
  }
  return (result.data as AssignmentGraphRow | null) ?? null;
}

export async function listTeacherAssignments(
  admin: SupabaseClient,
  filter: {
    instituteId: string;
    academicYearId?: string;
    sectionId?: string;
    classId?: string;
    status?: "active" | "inactive";
  },
): Promise<AssignmentGraphRow[]> {
  let query = admin
    .from("teacher_assignment")
    .select(
      "id, institute_id, academic_year_id, class_id, section_id, subject_id, teacher_id, status, deleted_at",
    )
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.academicYearId) {
    query = query.eq("academic_year_id", filter.academicYearId);
  }
  if (filter.sectionId) {
    query = query.eq("section_id", filter.sectionId);
  }
  if (filter.classId) {
    query = query.eq("class_id", filter.classId);
  }
  if (filter.status) {
    query = query.eq("status", filter.status);
  }

  const result = await query;
  return ensureDbOk(result) as AssignmentGraphRow[];
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

  if (result.error) {
    ensureDbOk(result);
  }
  return (result.data as SectionRow | null) ?? null;
}

export async function findTeacherInInstitute(
  admin: SupabaseClient,
  input: { teacherId: string; instituteId: string },
): Promise<{ id: string; institute_id: string } | null> {
  const result = await admin
    .from("teacher")
    .select("id, institute_id")
    .eq("id", input.teacherId)
    .eq("institute_id", input.instituteId)
    .is("deleted_at", null)
    .maybeSingle();

  if (result.error) {
    ensureDbOk(result);
  }
  return (result.data as { id: string; institute_id: string } | null) ?? null;
}

export async function insertTimetableSlot(
  admin: SupabaseClient,
  input: CreateTimetableSlotInput,
): Promise<TimetableSlotRow> {
  const result = await admin
    .from("timetable_slot")
    .insert({
      institute_id: input.instituteId,
      academic_year_id: input.academicYearId,
      class_id: input.classId,
      section_id: input.sectionId,
      teacher_assignment_id: input.teacherAssignmentId,
      day_of_week: input.dayOfWeek,
      period_index: input.periodIndex,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      room: input.room ?? null,
      status: input.status ?? "active",
    })
    .select(SLOT_COLUMNS)
    .single();

  return ensureDbOk(result) as TimetableSlotRow;
}

export async function updateTimetableSlot(
  admin: SupabaseClient,
  id: string,
  patch: UpdateTimetableSlotInput,
): Promise<TimetableSlotRow> {
  const row: Record<string, unknown> = {};
  if (patch.teacherAssignmentId !== undefined) {
    row.teacher_assignment_id = patch.teacherAssignmentId;
  }
  if (patch.dayOfWeek !== undefined) row.day_of_week = patch.dayOfWeek;
  if (patch.periodIndex !== undefined) row.period_index = patch.periodIndex;
  if (patch.startsAt !== undefined) row.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) row.ends_at = patch.endsAt;
  if (patch.room !== undefined) row.room = patch.room;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.academicYearId !== undefined) {
    row.academic_year_id = patch.academicYearId;
  }
  if (patch.classId !== undefined) row.class_id = patch.classId;
  if (patch.sectionId !== undefined) row.section_id = patch.sectionId;

  const result = await admin
    .from("timetable_slot")
    .update(row)
    .eq("id", id)
    .is("deleted_at", null)
    .select(SLOT_COLUMNS)
    .single();

  return ensureDbOk(result) as TimetableSlotRow;
}

export async function softDeleteTimetableSlot(
  admin: SupabaseClient,
  id: string,
): Promise<TimetableSlotRow> {
  const result = await admin
    .from("timetable_slot")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(SLOT_COLUMNS)
    .single();

  return ensureDbOk(result) as TimetableSlotRow;
}
