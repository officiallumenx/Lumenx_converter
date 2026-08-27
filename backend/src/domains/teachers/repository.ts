import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateTeacherInput,
  ListTeachersFilter,
  TeacherRow,
  UpdateTeacherInput,
} from "./types.js";

const TEACHER_COLS =
  "id, institute_id, user_profile_id, legacy_code, employee_id, display_name, phone, email, department, qualification, date_of_birth, joined_on, teaching_scope, portal_access_level, status, subjects, assigned_section_labels, source_career_application_id, created_at, updated_at, deleted_at";

export async function listTeachers(
  admin: SupabaseClient,
  filter: ListTeachersFilter,
): Promise<TeacherRow[]> {
  let query = admin
    .from("teacher")
    .select(TEACHER_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.teachingScope) query = query.eq("teaching_scope", filter.teachingScope);

  const result = await query;
  let rows = ensureDbOk(result) as TeacherRow[];

  if (filter.q) {
    const q = filter.q.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const hay = [
          r.display_name,
          r.phone,
          r.email,
          r.employee_id,
          r.legacy_code,
          r.department,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
  }

  return rows;
}

export async function findTeacherById(
  admin: SupabaseClient,
  id: string,
): Promise<TeacherRow | null> {
  const result = await admin
    .from("teacher")
    .select(TEACHER_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TeacherRow | null) ?? null;
}

export async function insertTeacher(
  admin: SupabaseClient,
  input: CreateTeacherInput,
): Promise<TeacherRow> {
  const result = await admin
    .from("teacher")
    .insert({
      institute_id: input.instituteId,
      user_profile_id: null,
      legacy_code: input.legacyCode ?? null,
      employee_id: input.employeeId ?? null,
      display_name: input.displayName,
      phone: input.phone ?? null,
      email: input.email ?? null,
      department: input.department,
      qualification: input.qualification ?? null,
      date_of_birth: input.dateOfBirth ?? null,
      joined_on: input.joinedOn ?? null,
      teaching_scope: input.teachingScope,
      portal_access_level: input.portalAccessLevel,
      status: input.status ?? "active",
      subjects: input.subjects ?? null,
      assigned_section_labels: input.assignedSectionLabels ?? null,
      source_career_application_id: null,
    })
    .select(TEACHER_COLS)
    .single();
  return ensureDbOk(result) as TeacherRow;
}

export async function updateTeacherFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<TeacherRow | null> {
  const result = await admin
    .from("teacher")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(TEACHER_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TeacherRow | null) ?? null;
}

export async function softDeleteTeacher(
  admin: SupabaseClient,
  id: string,
): Promise<TeacherRow | null> {
  const result = await admin
    .from("teacher")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(TEACHER_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TeacherRow | null) ?? null;
}

export function toTeacherUpdatePatch(
  input: UpdateTeacherInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.department !== undefined) patch.department = input.department;
  if (input.teachingScope !== undefined) patch.teaching_scope = input.teachingScope;
  if (input.portalAccessLevel !== undefined) {
    patch.portal_access_level = input.portalAccessLevel;
  }
  if (input.status !== undefined) patch.status = input.status;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.email !== undefined) patch.email = input.email;
  if (input.qualification !== undefined) patch.qualification = input.qualification;
  if (input.dateOfBirth !== undefined) patch.date_of_birth = input.dateOfBirth;
  if (input.joinedOn !== undefined) patch.joined_on = input.joinedOn;
  if (input.employeeId !== undefined) patch.employee_id = input.employeeId;
  if (input.legacyCode !== undefined) patch.legacy_code = input.legacyCode;
  if (input.subjects !== undefined) patch.subjects = input.subjects;
  if (input.assignedSectionLabels !== undefined) {
    patch.assigned_section_labels = input.assignedSectionLabels;
  }
  return patch;
}
