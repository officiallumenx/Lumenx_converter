import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  AcademicYearRow,
  ClassRow,
  CreateAcademicYearInput,
  CreateClassInput,
  CreateSectionInput,
  CreateSubjectInput,
  EnrollmentScopeRow,
  ListAcademicYearsFilter,
  ListClassesFilter,
  ListSectionsFilter,
  ListSubjectsFilter,
  SectionRow,
  SubjectRow,
  UpdateAcademicYearInput,
  UpdateClassInput,
  UpdateSectionInput,
  UpdateSubjectInput,
} from "./types.js";

const YEAR_COLS =
  "id, institute_id, name, code, starts_on, ends_on, status, created_at, updated_at, deleted_at";

const CLASS_COLS =
  "id, institute_id, academic_year_id, name, code, sort_order, status, created_at, updated_at, deleted_at";

const SECTION_COLS =
  "id, institute_id, academic_year_id, class_id, name, code, capacity, room, sort_order, status, created_at, updated_at, deleted_at";

const SUBJECT_COLS =
  "id, institute_id, name, code, category, periods_per_week, applicable_class_codes, status, created_at, updated_at, deleted_at";

const ENROLLMENT_SCOPE_COLS =
  "id, institute_id, academic_year_id, student_id, class_id, section_id, status, deleted_at";

// ── Academic years ───────────────────────────────────────────────

export async function listAcademicYears(
  admin: SupabaseClient,
  filter: ListAcademicYearsFilter,
): Promise<AcademicYearRow[]> {
  let query = admin
    .from("academic_year")
    .select(YEAR_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.status) query = query.eq("status", filter.status);

  const result = await query;
  return ensureDbOk(result) as AcademicYearRow[];
}

export async function findAcademicYearById(
  admin: SupabaseClient,
  id: string,
): Promise<AcademicYearRow | null> {
  const result = await admin
    .from("academic_year")
    .select(YEAR_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AcademicYearRow | null) ?? null;
}

export async function insertAcademicYear(
  admin: SupabaseClient,
  input: CreateAcademicYearInput,
): Promise<AcademicYearRow> {
  const result = await admin
    .from("academic_year")
    .insert({
      institute_id: input.instituteId,
      name: input.name,
      code: input.code,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      status: input.status ?? "upcoming",
    })
    .select(YEAR_COLS)
    .single();
  return ensureDbOk(result) as AcademicYearRow;
}

export async function updateAcademicYearFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<AcademicYearRow | null> {
  const result = await admin
    .from("academic_year")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(YEAR_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AcademicYearRow | null) ?? null;
}

export async function softDeleteAcademicYear(
  admin: SupabaseClient,
  id: string,
): Promise<AcademicYearRow | null> {
  const result = await admin
    .from("academic_year")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(YEAR_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AcademicYearRow | null) ?? null;
}

export function toAcademicYearUpdatePatch(
  input: UpdateAcademicYearInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.code !== undefined) patch.code = input.code;
  if (input.startsOn !== undefined) patch.starts_on = input.startsOn;
  if (input.endsOn !== undefined) patch.ends_on = input.endsOn;
  if (input.status !== undefined) patch.status = input.status;
  return patch;
}

// ── Classes ──────────────────────────────────────────────────────

export async function listClasses(
  admin: SupabaseClient,
  filter: ListClassesFilter,
): Promise<ClassRow[]> {
  let query = admin
    .from("class")
    .select(CLASS_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.academicYearId) {
    query = query.eq("academic_year_id", filter.academicYearId);
  }
  if (filter.status) query = query.eq("status", filter.status);

  const result = await query;
  return ensureDbOk(result) as ClassRow[];
}

export async function findClassById(
  admin: SupabaseClient,
  id: string,
): Promise<ClassRow | null> {
  const result = await admin
    .from("class")
    .select(CLASS_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ClassRow | null) ?? null;
}

export async function insertClass(
  admin: SupabaseClient,
  input: CreateClassInput,
): Promise<ClassRow> {
  const result = await admin
    .from("class")
    .insert({
      institute_id: input.instituteId,
      academic_year_id: input.academicYearId,
      name: input.name,
      code: input.code,
      sort_order: input.sortOrder ?? 0,
      status: input.status ?? "active",
    })
    .select(CLASS_COLS)
    .single();
  return ensureDbOk(result) as ClassRow;
}

export async function updateClassFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<ClassRow | null> {
  const result = await admin
    .from("class")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(CLASS_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ClassRow | null) ?? null;
}

export async function softDeleteClass(
  admin: SupabaseClient,
  id: string,
): Promise<ClassRow | null> {
  const result = await admin
    .from("class")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(CLASS_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ClassRow | null) ?? null;
}

export function toClassUpdatePatch(
  input: UpdateClassInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.code !== undefined) patch.code = input.code;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
  if (input.status !== undefined) patch.status = input.status;
  return patch;
}

// ── Sections ─────────────────────────────────────────────────────

export async function listSections(
  admin: SupabaseClient,
  filter: ListSectionsFilter,
): Promise<SectionRow[]> {
  let query = admin
    .from("section")
    .select(SECTION_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.academicYearId) {
    query = query.eq("academic_year_id", filter.academicYearId);
  }
  if (filter.classId) query = query.eq("class_id", filter.classId);
  if (filter.status) query = query.eq("status", filter.status);

  const result = await query;
  return ensureDbOk(result) as SectionRow[];
}

export async function findSectionById(
  admin: SupabaseClient,
  id: string,
): Promise<SectionRow | null> {
  const result = await admin
    .from("section")
    .select(SECTION_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SectionRow | null) ?? null;
}

export async function insertSection(
  admin: SupabaseClient,
  input: CreateSectionInput,
): Promise<SectionRow> {
  const result = await admin
    .from("section")
    .insert({
      institute_id: input.instituteId,
      academic_year_id: input.academicYearId,
      class_id: input.classId,
      name: input.name,
      code: input.code,
      capacity: input.capacity ?? null,
      room: input.room ?? null,
      sort_order: input.sortOrder ?? 0,
      status: input.status ?? "active",
    })
    .select(SECTION_COLS)
    .single();
  return ensureDbOk(result) as SectionRow;
}

export async function updateSectionFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<SectionRow | null> {
  const result = await admin
    .from("section")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(SECTION_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SectionRow | null) ?? null;
}

export async function softDeleteSection(
  admin: SupabaseClient,
  id: string,
): Promise<SectionRow | null> {
  const result = await admin
    .from("section")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(SECTION_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SectionRow | null) ?? null;
}

export function toSectionUpdatePatch(
  input: UpdateSectionInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.code !== undefined) patch.code = input.code;
  if (input.capacity !== undefined) patch.capacity = input.capacity;
  if (input.room !== undefined) patch.room = input.room;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
  if (input.status !== undefined) patch.status = input.status;
  return patch;
}

// ── Subjects ─────────────────────────────────────────────────────

export async function listSubjects(
  admin: SupabaseClient,
  filter: ListSubjectsFilter,
): Promise<SubjectRow[]> {
  let query = admin
    .from("subject")
    .select(SUBJECT_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.status) query = query.eq("status", filter.status);

  const result = await query;
  return ensureDbOk(result) as SubjectRow[];
}

export async function findSubjectById(
  admin: SupabaseClient,
  id: string,
): Promise<SubjectRow | null> {
  const result = await admin
    .from("subject")
    .select(SUBJECT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SubjectRow | null) ?? null;
}

export async function insertSubject(
  admin: SupabaseClient,
  input: CreateSubjectInput,
): Promise<SubjectRow> {
  const result = await admin
    .from("subject")
    .insert({
      institute_id: input.instituteId,
      name: input.name,
      code: input.code,
      category: input.category,
      periods_per_week: input.periodsPerWeek,
      applicable_class_codes: input.applicableClassCodes,
      status: input.status ?? "draft",
    })
    .select(SUBJECT_COLS)
    .single();
  return ensureDbOk(result) as SubjectRow;
}

export async function updateSubjectFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<SubjectRow | null> {
  const result = await admin
    .from("subject")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(SUBJECT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SubjectRow | null) ?? null;
}

export async function softDeleteSubject(
  admin: SupabaseClient,
  id: string,
): Promise<SubjectRow | null> {
  const result = await admin
    .from("subject")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(SUBJECT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SubjectRow | null) ?? null;
}

export function toSubjectUpdatePatch(
  input: UpdateSubjectInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.code !== undefined) patch.code = input.code;
  if (input.category !== undefined) patch.category = input.category;
  if (input.periodsPerWeek !== undefined) {
    patch.periods_per_week = input.periodsPerWeek;
  }
  if (input.applicableClassCodes !== undefined) {
    patch.applicable_class_codes = input.applicableClassCodes;
  }
  if (input.status !== undefined) patch.status = input.status;
  return patch;
}

// ── Learner scope helpers ────────────────────────────────────────

export async function listEnrollmentsForStudents(
  admin: SupabaseClient,
  instituteId: string,
  studentIds: string[],
): Promise<EnrollmentScopeRow[]> {
  if (studentIds.length === 0) return [];
  const result = await admin
    .from("enrollment")
    .select(ENROLLMENT_SCOPE_COLS)
    .eq("institute_id", instituteId)
    .in("student_id", studentIds)
    .eq("status", "active")
    .is("deleted_at", null);
  return ensureDbOk(result) as EnrollmentScopeRow[];
}

export async function listGuardianStudentIds(
  admin: SupabaseClient,
  parentId: string,
  instituteId: string,
): Promise<string[]> {
  const result = await admin
    .from("guardian_link")
    .select("student_id")
    .eq("parent_id", parentId)
    .eq("institute_id", instituteId)
    .eq("status", "active")
    .is("deleted_at", null);
  const rows = ensureDbOk(result) as Array<{ student_id: string }>;
  return rows.map((r) => r.student_id);
}

export async function findClassCodesByIds(
  admin: SupabaseClient,
  classIds: string[],
): Promise<Map<string, string>> {
  if (classIds.length === 0) return new Map();
  const result = await admin
    .from("class")
    .select("id, code")
    .in("id", classIds)
    .is("deleted_at", null);
  const rows = ensureDbOk(result) as Array<{ id: string; code: string }>;
  return new Map(rows.map((r) => [r.id, r.code]));
}
