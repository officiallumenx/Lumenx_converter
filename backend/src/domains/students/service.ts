import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findStudentById,
  insertStudent,
  listGuardianStudentIds,
  listStudents,
  softDeleteStudent,
  toStudentUpdatePatch,
  updateStudentFields,
} from "./repository.js";
import type {
  CreateStudentInput,
  CreateStudentResult,
  ListStudentsFilter,
  StudentDto,
  StudentGuardianDto,
  StudentRow,
  UpdateStudentInput,
} from "./types.js";
import { canonicalPhoneDigits } from "../identity/phone.js";
import {
  createGuardianLinkForActor,
  createParentForActor,
} from "../parents/service.js";
import {
  findParentById,
  findParentByPhoneInInstitute,
  listLinksForStudent,
  updateParentFields,
} from "../parents/repository.js";
import type { GuardianRelationship } from "../parents/types.js";

export const STUDENT_STAFF_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "admissions_officer",
] as const;

export const STUDENT_STAFF_READ_ROLES = [
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

export function toStudentDto(row: StudentRow): StudentDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    userProfileId: row.user_profile_id,
    legacyCode: row.legacy_code,
    admissionNumber: row.admission_number,
    sourceAdmissionApplicationId: row.source_admission_application_id,
    firstName: row.first_name,
    surname: row.surname,
    displayName: row.display_name,
    gender: row.gender,
    dateOfBirth: row.date_of_birth,
    address: row.address,
    classLabel: row.class_label,
    sectionLabel: row.section_label,
    rollNo: row.roll_no,
    status: row.status,
    accessStatus: row.access_status,
    bloodGroup: row.blood_group,
    emergencyContact: row.emergency_contact,
    house: row.house,
    photoAssetPath: row.photo_asset_path,
    idCardIssuedOn: row.id_card_issued_on,
    idCardValidTill: row.id_card_valid_till,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) return false;
  return STUDENT_STAFF_READ_ROLES.some((role) => membership.roles.includes(role));
}

function assertStaffWriter(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [...STUDENT_STAFF_WRITE_ROLES]);
}

function defaultDisplayName(firstName: string, surname: string): string {
  return `${firstName.trim()} ${surname.trim()}`.trim();
}

async function resolveAccessibleStudentIds(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const s of actor.students) {
    if (s.instituteId === instituteId) ids.add(s.studentId);
  }
  for (const p of actor.parents) {
    if (p.instituteId !== instituteId) continue;
    const linked = await listGuardianStudentIds(admin, p.parentId, instituteId);
    for (const sid of linked) ids.add(sid);
  }
  return ids;
}

async function assertCanReadStudent(
  admin: SupabaseClient,
  actor: Actor,
  row: StudentRow,
): Promise<void> {
  assertInstituteAccess(actor, row.institute_id);

  if (isStaffReader(actor, row.institute_id)) return;

  const accessible = await resolveAccessibleStudentIds(
    admin,
    actor,
    row.institute_id,
  );
  if (accessible.has(row.id)) return;

  throw AppError.forbidden("Insufficient permissions");
}

export async function listStudentsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListStudentsFilter,
): Promise<StudentDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listStudents(admin, { ...filter, instituteId });

  if (isStaffReader(actor, instituteId)) {
    return rows.map(toStudentDto);
  }

  const accessible = await resolveAccessibleStudentIds(admin, actor, instituteId);
  if (accessible.size === 0) {
    throw AppError.forbidden("Insufficient permissions");
  }

  return rows.filter((r) => accessible.has(r.id)).map(toStudentDto);
}

export async function getStudentForActor(
  admin: SupabaseClient,
  actor: Actor,
  studentId: string,
): Promise<StudentDto> {
  const row = await findStudentById(admin, studentId);
  if (!row) throw AppError.notFound("Student not found");

  await assertCanReadStudent(admin, actor, row);
  return toStudentDto(row);
}

async function linkOrCreateParentForStudent(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  studentId: string,
  parentInput: NonNullable<CreateStudentInput["parent"]>,
  fallbackAddress: string,
): Promise<string> {
  const name = parentInput.name.trim();
  const phone = canonicalPhoneDigits(parentInput.phone);
  if (!name) {
    throw AppError.validation("parent name is required", {
      parent_name: ["Required"],
    });
  }
  if (!phone) {
    throw AppError.validation("parent phone must contain exactly 10 digits", {
      parent_phone: ["Invalid"],
    });
  }

  const relationship: GuardianRelationship =
    parentInput.relationship ?? "guardian";
  const address =
    parentInput.address?.trim() || fallbackAddress.trim() || null;

  const existing = await findParentByPhoneInInstitute(
    admin,
    phone,
    instituteId,
  );

  if (existing) {
    // Same phone → sibling: link this student to the existing parent.
    await createGuardianLinkForActor(admin, actor, existing.id, {
      studentId,
      relationship,
      isPrimary: true,
      isEmergencyContact: true,
    });
    // Backfill parent address when the guardian row was created without one.
    if (address && !existing.address?.trim()) {
      await updateParentFields(admin, existing.id, { address });
    }
    return existing.id;
  }

  const parent = await createParentForActor(admin, actor, {
    instituteId,
    name,
    phone,
    address,
    initialLinks: [
      {
        studentId,
        relationship,
        isPrimary: true,
        isEmergencyContact: true,
      },
    ],
  });
  return parent.id;
}

export async function createStudentForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateStudentInput,
): Promise<CreateStudentResult> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertStaffWriter(actor, instituteId);

  const firstName = input.firstName.trim();
  const surname = input.surname.trim();
  if (!firstName || !surname) {
    throw AppError.validation("first_name and surname are required", {
      first_name: !firstName ? ["Required"] : undefined,
      surname: !surname ? ["Required"] : undefined,
    });
  }

  const displayName =
    input.displayName?.trim() || defaultDisplayName(firstName, surname);

  // Client user_profile_id is ignored — linking is a later identity phase.
  const row = await insertStudent(admin, {
    ...input,
    instituteId,
    firstName,
    surname,
    displayName,
  });
  const student = toStudentDto(row);

  if (!input.parent) {
    return student;
  }

  const parentId = await linkOrCreateParentForStudent(
    admin,
    actor,
    instituteId,
    student.id,
    input.parent,
    input.address,
  );
  return { ...student, parentId };
}

export async function updateStudentForActor(
  admin: SupabaseClient,
  actor: Actor,
  studentId: string,
  patch: UpdateStudentInput,
): Promise<StudentDto> {
  const existing = await findStudentById(admin, studentId);
  if (!existing) throw AppError.notFound("Student not found");

  assertStaffWriter(actor, existing.institute_id);

  const fieldPatch = toStudentUpdatePatch(patch);
  if (Object.keys(fieldPatch).length === 0) {
    return toStudentDto(existing);
  }

  if (typeof fieldPatch.first_name === "string") {
    fieldPatch.first_name = fieldPatch.first_name.trim();
  }
  if (typeof fieldPatch.surname === "string") {
    fieldPatch.surname = fieldPatch.surname.trim();
  }
  if (typeof fieldPatch.display_name === "string") {
    fieldPatch.display_name = fieldPatch.display_name.trim();
  }

  // If names changed but display_name omitted, refresh display_name.
  if (
    (fieldPatch.first_name !== undefined || fieldPatch.surname !== undefined) &&
    fieldPatch.display_name === undefined
  ) {
    const first =
      typeof fieldPatch.first_name === "string"
        ? fieldPatch.first_name
        : existing.first_name;
    const surname =
      typeof fieldPatch.surname === "string"
        ? fieldPatch.surname
        : existing.surname;
    fieldPatch.display_name = defaultDisplayName(first, surname);
  }

  const updated = await updateStudentFields(admin, studentId, fieldPatch);
  if (!updated) throw AppError.notFound("Student not found");
  return toStudentDto(updated);
}

export async function deleteStudentForActor(
  admin: SupabaseClient,
  actor: Actor,
  studentId: string,
): Promise<void> {
  const existing = await findStudentById(admin, studentId);
  if (!existing) throw AppError.notFound("Student not found");

  assertStaffWriter(actor, existing.institute_id);

  const deleted = await softDeleteStudent(admin, studentId);
  if (!deleted) {
    throw AppError.conflict("Student was already deleted");
  }

  const { recordEntitySoftDeleteInRecycleBin } = await import(
    "../recycle/on-soft-delete.js"
  );
  await recordEntitySoftDeleteInRecycleBin(admin, actor, {
    instituteId: existing.institute_id,
    entityKind: "student",
    entityId: studentId,
    module: "Students",
    title:
      existing.display_name?.trim() ||
      `${existing.first_name} ${existing.surname}`.trim() ||
      "Student",
    subtitle: existing.admission_number,
  });
}

export async function getStudentGuardiansForActor(
  admin: SupabaseClient,
  actor: Actor,
  studentId: string,
): Promise<StudentGuardianDto[]> {
  const row = await findStudentById(admin, studentId);
  if (!row) throw AppError.notFound("Student not found");

  await assertCanReadStudent(admin, actor, row);

  const links = await listLinksForStudent(admin, studentId, row.institute_id);
  const guardians: StudentGuardianDto[] = [];

  for (const link of links) {
    const parent = await findParentById(admin, link.parent_id);
    if (!parent || parent.deleted_at) continue;
    guardians.push({
      linkId: link.id,
      parentId: link.parent_id,
      parentName: parent.name?.trim() || "Parent",
      phone: parent.phone,
      email: parent.email,
      relationship: link.relationship,
      isPrimary: link.is_primary,
      isEmergencyContact: link.is_emergency_contact,
    });
  }

  return guardians;
}
