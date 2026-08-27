import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findTeacherById,
  insertTeacher,
  listTeachers,
  softDeleteTeacher,
  toTeacherUpdatePatch,
  updateTeacherFields,
} from "./repository.js";
import type {
  CreateTeacherInput,
  ListTeachersFilter,
  TeacherDto,
  TeacherRow,
  UpdateTeacherInput,
} from "./types.js";

export const TEACHER_STAFF_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "admissions_officer",
] as const;

export const TEACHER_STAFF_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "teacher",
  "accountant",
  "admissions_officer",
  "it_admin",
  "staff",
] as const;

export function toTeacherDto(row: TeacherRow): TeacherDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    userProfileId: row.user_profile_id,
    legacyCode: row.legacy_code,
    employeeId: row.employee_id,
    displayName: row.display_name,
    phone: row.phone,
    email: row.email,
    department: row.department,
    qualification: row.qualification,
    dateOfBirth: row.date_of_birth,
    joinedOn: row.joined_on,
    teachingScope: row.teaching_scope,
    portalAccessLevel: row.portal_access_level,
    status: row.status,
    subjects: row.subjects,
    assignedSectionLabels: row.assigned_section_labels,
    sourceCareerApplicationId: row.source_career_application_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) return false;
  return TEACHER_STAFF_READ_ROLES.some((role) => membership.roles.includes(role));
}

function assertStaffWriter(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [...TEACHER_STAFF_WRITE_ROLES]);
}

function resolveOwnTeacherIds(actor: Actor, instituteId: string): Set<string> {
  return new Set(
    actor.teachers
      .filter((t) => t.instituteId === instituteId)
      .map((t) => t.teacherId),
  );
}

async function assertCanReadTeacher(
  actor: Actor,
  row: TeacherRow,
): Promise<void> {
  assertInstituteAccess(actor, row.institute_id);
  if (isStaffReader(actor, row.institute_id)) return;

  const own = resolveOwnTeacherIds(actor, row.institute_id);
  if (own.has(row.id)) return;

  // Learners/parents: no teacher directory access.
  throw AppError.forbidden("Insufficient permissions");
}

export async function listTeachersForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListTeachersFilter,
): Promise<TeacherDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listTeachers(admin, { ...filter, instituteId });

  if (isStaffReader(actor, instituteId)) {
    return rows.map(toTeacherDto);
  }

  const own = resolveOwnTeacherIds(actor, instituteId);
  if (own.size === 0) {
    throw AppError.forbidden("Insufficient permissions");
  }

  return rows.filter((r) => own.has(r.id)).map(toTeacherDto);
}

export async function getTeacherForActor(
  admin: SupabaseClient,
  actor: Actor,
  teacherId: string,
): Promise<TeacherDto> {
  const row = await findTeacherById(admin, teacherId);
  if (!row) throw AppError.notFound("Teacher not found");

  await assertCanReadTeacher(actor, row);
  return toTeacherDto(row);
}

export async function createTeacherForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateTeacherInput,
): Promise<TeacherDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertStaffWriter(actor, instituteId);

  const displayName = input.displayName.trim();
  const department = input.department.trim();
  if (!displayName || !department) {
    throw AppError.validation("display_name and department are required", {
      display_name: !displayName ? ["Required"] : undefined,
      department: !department ? ["Required"] : undefined,
    });
  }

  const row = await insertTeacher(admin, {
    ...input,
    instituteId,
    displayName,
    department,
  });
  return toTeacherDto(row);
}

export async function updateTeacherForActor(
  admin: SupabaseClient,
  actor: Actor,
  teacherId: string,
  patch: UpdateTeacherInput,
): Promise<TeacherDto> {
  const existing = await findTeacherById(admin, teacherId);
  if (!existing) throw AppError.notFound("Teacher not found");

  assertStaffWriter(actor, existing.institute_id);

  const fieldPatch = toTeacherUpdatePatch(patch);
  if (typeof fieldPatch.display_name === "string") {
    fieldPatch.display_name = fieldPatch.display_name.trim();
  }
  if (typeof fieldPatch.department === "string") {
    fieldPatch.department = fieldPatch.department.trim();
  }

  if (Object.keys(fieldPatch).length === 0) {
    return toTeacherDto(existing);
  }

  const updated = await updateTeacherFields(admin, teacherId, fieldPatch);
  if (!updated) throw AppError.notFound("Teacher not found");
  return toTeacherDto(updated);
}

export async function deleteTeacherForActor(
  admin: SupabaseClient,
  actor: Actor,
  teacherId: string,
): Promise<void> {
  const existing = await findTeacherById(admin, teacherId);
  if (!existing) throw AppError.notFound("Teacher not found");

  assertStaffWriter(actor, existing.institute_id);

  const deleted = await softDeleteTeacher(admin, teacherId);
  if (!deleted) {
    throw AppError.conflict("Teacher was already deleted");
  }
}
