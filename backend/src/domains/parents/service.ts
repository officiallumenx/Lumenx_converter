import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  clearPrimaryForStudent,
  findLinkById,
  findParentById,
  findStudentInInstitute,
  insertGuardianLink,
  insertParent,
  listLinksForParent,
  listLinksForParentIds,
  listLinksForStudent,
  listParents,
  softDeleteGuardianLink,
  softDeleteParent,
  toLinkUpdatePatch,
  toParentUpdatePatch,
  updateGuardianLinkFields,
  updateParentFields,
} from "./repository.js";
import type {
  CreateGuardianLinkInput,
  CreateParentInput,
  GuardianLinkDto,
  GuardianLinkRow,
  ListParentsFilter,
  ParentDto,
  ParentRow,
  UpdateGuardianLinkInput,
  UpdateParentInput,
} from "./types.js";

export const PARENT_STAFF_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "admissions_officer",
] as const;

export const PARENT_STAFF_READ_ROLES = [
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

export function toLinkDto(row: GuardianLinkRow): GuardianLinkDto {
  return {
    id: row.id,
    studentId: row.student_id,
    parentId: row.parent_id,
    relationship: row.relationship,
    isPrimary: row.is_primary,
    isEmergencyContact: row.is_emergency_contact,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toParentDto(
  row: ParentRow,
  links?: GuardianLinkRow[],
): ParentDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    userProfileId: row.user_profile_id,
    legacyCode: row.legacy_code,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    inviteStatus: row.invite_status,
    accessStatus: row.access_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    links: links?.map(toLinkDto),
  };
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) return false;
  return PARENT_STAFF_READ_ROLES.some((role) => membership.roles.includes(role));
}

function assertStaffWriter(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [...PARENT_STAFF_WRITE_ROLES]);
}

async function resolveAccessibleParentIds(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<Set<string>> {
  const ids = new Set<string>();

  for (const p of actor.parents) {
    if (p.instituteId === instituteId) ids.add(p.parentId);
  }

  for (const s of actor.students) {
    if (s.instituteId !== instituteId) continue;
    const links = await listLinksForStudent(admin, s.studentId, instituteId);
    for (const link of links) ids.add(link.parent_id);
  }

  return ids;
}

/**
 * Staff/platform: full links.
 * Parent: all links on own parent row.
 * Learner: only links to their own student row(s) — never sibling peer studentIds.
 */
function filterLinksForActor(
  actor: Actor,
  instituteId: string,
  parentId: string,
  links: GuardianLinkRow[],
): GuardianLinkRow[] {
  if (isStaffReader(actor, instituteId)) return links;

  const ownsParent = actor.parents.some(
    (p) => p.instituteId === instituteId && p.parentId === parentId,
  );
  if (ownsParent) return links;

  const ownStudents = new Set(
    actor.students
      .filter((s) => s.instituteId === instituteId)
      .map((s) => s.studentId),
  );
  return links.filter((l) => ownStudents.has(l.student_id));
}

async function assertCanReadParent(
  admin: SupabaseClient,
  actor: Actor,
  row: ParentRow,
): Promise<void> {
  assertInstituteAccess(actor, row.institute_id);
  if (isStaffReader(actor, row.institute_id)) return;

  const accessible = await resolveAccessibleParentIds(
    admin,
    actor,
    row.institute_id,
  );
  if (accessible.has(row.id)) return;
  throw AppError.forbidden("Insufficient permissions");
}

export async function listParentsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListParentsFilter,
): Promise<ParentDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listParents(admin, { ...filter, instituteId });

  let visible = rows;
  if (!isStaffReader(actor, instituteId)) {
    const accessible = await resolveAccessibleParentIds(admin, actor, instituteId);
    if (accessible.size === 0) {
      throw AppError.forbidden("Insufficient permissions");
    }
    visible = rows.filter((r) => accessible.has(r.id));
  }

  const links = await listLinksForParentIds(
    admin,
    visible.map((r) => r.id),
    instituteId,
  );
  const byParent = new Map<string, GuardianLinkRow[]>();
  for (const link of links) {
    const list = byParent.get(link.parent_id) ?? [];
    list.push(link);
    byParent.set(link.parent_id, list);
  }

  return visible.map((r) =>
    toParentDto(
      r,
      filterLinksForActor(actor, instituteId, r.id, byParent.get(r.id) ?? []),
    ),
  );
}

export async function getParentForActor(
  admin: SupabaseClient,
  actor: Actor,
  parentId: string,
): Promise<ParentDto> {
  const row = await findParentById(admin, parentId);
  if (!row) throw AppError.notFound("Parent not found");

  await assertCanReadParent(admin, actor, row);
  const links = await listLinksForParent(admin, row.id, row.institute_id);
  return toParentDto(
    row,
    filterLinksForActor(actor, row.institute_id, row.id, links),
  );
}

export async function createParentForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateParentInput,
): Promise<ParentDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertStaffWriter(actor, instituteId);

  const name = input.name.trim();
  const phone = input.phone.trim();
  if (!name || !phone) {
    throw AppError.validation("name and phone are required", {
      name: !name ? ["Required"] : undefined,
      phone: !phone ? ["Required"] : undefined,
    });
  }

  const row = await insertParent(admin, {
    ...input,
    instituteId,
    name,
    phone,
  });
  return toParentDto(row, []);
}

export async function updateParentForActor(
  admin: SupabaseClient,
  actor: Actor,
  parentId: string,
  patch: UpdateParentInput,
): Promise<ParentDto> {
  const existing = await findParentById(admin, parentId);
  if (!existing) throw AppError.notFound("Parent not found");

  assertStaffWriter(actor, existing.institute_id);

  const fieldPatch = toParentUpdatePatch(patch);
  if (typeof fieldPatch.name === "string") {
    fieldPatch.name = fieldPatch.name.trim();
  }
  if (typeof fieldPatch.phone === "string") {
    fieldPatch.phone = fieldPatch.phone.trim();
  }

  if (Object.keys(fieldPatch).length === 0) {
    const links = await listLinksForParent(
      admin,
      existing.id,
      existing.institute_id,
    );
    return toParentDto(existing, links);
  }

  const updated = await updateParentFields(admin, parentId, fieldPatch);
  if (!updated) throw AppError.notFound("Parent not found");
  const links = await listLinksForParent(
    admin,
    updated.id,
    updated.institute_id,
  );
  return toParentDto(updated, links);
}

export async function deleteParentForActor(
  admin: SupabaseClient,
  actor: Actor,
  parentId: string,
): Promise<void> {
  const existing = await findParentById(admin, parentId);
  if (!existing) throw AppError.notFound("Parent not found");

  assertStaffWriter(actor, existing.institute_id);

  const deleted = await softDeleteParent(admin, parentId);
  if (!deleted) {
    throw AppError.conflict("Parent was already deleted");
  }

  const { recordEntitySoftDeleteInRecycleBin } = await import(
    "../recycle/on-soft-delete.js"
  );
  await recordEntitySoftDeleteInRecycleBin(admin, actor, {
    instituteId: existing.institute_id,
    entityKind: "parent",
    entityId: parentId,
    module: "Parents",
    title: existing.display_name?.trim() || "Parent",
    subtitle: existing.phone ?? existing.email,
  });
}

export async function createGuardianLinkForActor(
  admin: SupabaseClient,
  actor: Actor,
  parentId: string,
  input: CreateGuardianLinkInput,
): Promise<GuardianLinkDto> {
  const parent = await findParentById(admin, parentId);
  if (!parent) throw AppError.notFound("Parent not found");

  assertStaffWriter(actor, parent.institute_id);

  const student = await findStudentInInstitute(
    admin,
    input.studentId,
    parent.institute_id,
  );
  if (!student) {
    throw AppError.validation("Referenced resource is invalid", {
      student_id: ["Student not found in this institute"],
    });
  }

  if (input.isPrimary) {
    await clearPrimaryForStudent(admin, input.studentId, parent.institute_id);
  }

  const link = await insertGuardianLink(admin, {
    ...input,
    instituteId: parent.institute_id,
    parentId: parent.id,
  });
  return toLinkDto(link);
}

export async function updateGuardianLinkForActor(
  admin: SupabaseClient,
  actor: Actor,
  parentId: string,
  linkId: string,
  patch: UpdateGuardianLinkInput,
): Promise<GuardianLinkDto> {
  const parent = await findParentById(admin, parentId);
  if (!parent) throw AppError.notFound("Parent not found");

  assertStaffWriter(actor, parent.institute_id);

  const existing = await findLinkById(admin, linkId);
  if (!existing || existing.parent_id !== parent.id) {
    throw AppError.notFound("Guardian link not found");
  }
  if (existing.institute_id !== parent.institute_id) {
    throw AppError.forbidden("Insufficient permissions");
  }

  if (patch.isPrimary === true) {
    await clearPrimaryForStudent(
      admin,
      existing.student_id,
      parent.institute_id,
    );
  }

  const fieldPatch = toLinkUpdatePatch(patch);
  if (Object.keys(fieldPatch).length === 0) {
    return toLinkDto(existing);
  }

  const updated = await updateGuardianLinkFields(admin, linkId, fieldPatch);
  if (!updated) throw AppError.notFound("Guardian link not found");
  return toLinkDto(updated);
}

export async function deleteGuardianLinkForActor(
  admin: SupabaseClient,
  actor: Actor,
  parentId: string,
  linkId: string,
): Promise<void> {
  const parent = await findParentById(admin, parentId);
  if (!parent) throw AppError.notFound("Parent not found");

  assertStaffWriter(actor, parent.institute_id);

  const existing = await findLinkById(admin, linkId);
  if (!existing || existing.parent_id !== parent.id) {
    throw AppError.notFound("Guardian link not found");
  }
  if (existing.institute_id !== parent.institute_id) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const deleted = await softDeleteGuardianLink(admin, linkId);
  if (!deleted) {
    throw AppError.conflict("Guardian link was already deleted");
  }
}
