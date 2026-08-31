import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findStaffAccountById,
  insertStaffAccount,
  listStaffAccounts,
  softDeleteStaffAccount,
  toStaffAccountUpdatePatch,
  updateStaffAccountFields,
} from "./repository.js";
import type {
  CreateStaffAccountInput,
  ListStaffAccountsFilter,
  StaffAccountDto,
  StaffAccountRow,
  UpdateStaffAccountInput,
} from "./types.js";

export const STAFF_ACCOUNT_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
] as const;

export const STAFF_ACCOUNT_READ_ROLES = [
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

export function toStaffAccountDto(row: StaffAccountRow): StaffAccountDto {
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
    jobTitle: row.job_title,
    dateOfBirth: row.date_of_birth,
    joinedOn: row.joined_on,
    status: row.status,
    sourceCareerApplicationId: row.source_career_application_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) return false;
  return STAFF_ACCOUNT_READ_ROLES.some((role) =>
    membership.roles.includes(role),
  );
}

function assertStaffWriter(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [...STAFF_ACCOUNT_WRITE_ROLES]);
}

function resolveOwnStaffIds(actor: Actor, instituteId: string): Set<string> {
  return new Set(
    actor.staff
      .filter((s) => s.instituteId === instituteId)
      .map((s) => s.staffAccountId),
  );
}

async function assertCanReadStaff(
  actor: Actor,
  row: StaffAccountRow,
): Promise<void> {
  assertInstituteAccess(actor, row.institute_id);
  if (isStaffReader(actor, row.institute_id)) return;

  const own = resolveOwnStaffIds(actor, row.institute_id);
  if (own.has(row.id)) return;

  throw AppError.forbidden("Insufficient permissions");
}

export async function listStaffAccountsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListStaffAccountsFilter,
): Promise<StaffAccountDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listStaffAccounts(admin, { ...filter, instituteId });

  if (isStaffReader(actor, instituteId)) {
    return rows.map(toStaffAccountDto);
  }

  const own = resolveOwnStaffIds(actor, instituteId);
  if (own.size === 0) {
    throw AppError.forbidden("Insufficient permissions");
  }

  return rows.filter((r) => own.has(r.id)).map(toStaffAccountDto);
}

export async function getStaffAccountForActor(
  admin: SupabaseClient,
  actor: Actor,
  staffAccountId: string,
): Promise<StaffAccountDto> {
  const row = await findStaffAccountById(admin, staffAccountId);
  if (!row) throw AppError.notFound("Staff account not found");

  await assertCanReadStaff(actor, row);
  return toStaffAccountDto(row);
}

export async function createStaffAccountForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateStaffAccountInput,
): Promise<StaffAccountDto> {
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

  const row = await insertStaffAccount(admin, {
    ...input,
    instituteId,
    displayName,
    department,
    jobTitle: input.jobTitle?.trim() || null,
  });
  return toStaffAccountDto(row);
}

export async function updateStaffAccountForActor(
  admin: SupabaseClient,
  actor: Actor,
  staffAccountId: string,
  patch: UpdateStaffAccountInput,
): Promise<StaffAccountDto> {
  const existing = await findStaffAccountById(admin, staffAccountId);
  if (!existing) throw AppError.notFound("Staff account not found");

  assertStaffWriter(actor, existing.institute_id);

  const fieldPatch = toStaffAccountUpdatePatch(patch);
  if (typeof fieldPatch.display_name === "string") {
    fieldPatch.display_name = fieldPatch.display_name.trim();
  }
  if (typeof fieldPatch.department === "string") {
    fieldPatch.department = fieldPatch.department.trim();
  }
  if (typeof fieldPatch.job_title === "string") {
    fieldPatch.job_title = fieldPatch.job_title.trim() || null;
  }

  if (Object.keys(fieldPatch).length === 0) {
    return toStaffAccountDto(existing);
  }

  const updated = await updateStaffAccountFields(
    admin,
    staffAccountId,
    fieldPatch,
  );
  if (!updated) throw AppError.notFound("Staff account not found");
  return toStaffAccountDto(updated);
}

export async function deleteStaffAccountForActor(
  admin: SupabaseClient,
  actor: Actor,
  staffAccountId: string,
): Promise<void> {
  const existing = await findStaffAccountById(admin, staffAccountId);
  if (!existing) throw AppError.notFound("Staff account not found");

  assertStaffWriter(actor, existing.institute_id);

  const deleted = await softDeleteStaffAccount(admin, staffAccountId);
  if (!deleted) throw AppError.conflict("Staff account was already deleted");

  const { recordEntitySoftDeleteInRecycleBin } = await import(
    "../recycle/on-soft-delete.js"
  );
  await recordEntitySoftDeleteInRecycleBin(admin, actor, {
    instituteId: existing.institute_id,
    entityKind: "staff_account",
    entityId: staffAccountId,
    module: "Accounts",
    title: existing.display_name?.trim() || existing.email || "Staff account",
    subtitle: existing.department,
  });
}
