import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  assertPlatformOperator,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findInstituteById,
  findInstituteSettings,
  findMembershipById,
  findProfileById,
  insertInstitute,
  insertInstituteSettings,
  insertMembership,
  listAssignableRoleCodes,
  listAssignableRoles,
  listInstitutes,
  listMemberships,
  listRolesForMemberships,
  replaceMembershipRoles,
  softDeleteInstitute,
  softDeleteMembership,
  softDeleteMembershipsForInstitute,
  toInstituteUpdatePatch,
  toProfileUpdatePatch,
  toSettingsUpdatePatch,
  updateInstituteFields,
  updateInstituteSettingsFields,
  updateMembershipFields,
  updateProfileFields,
} from "./repository.js";
import type {
  CreateInstituteInput,
  CreateMembershipInput,
  InstituteDto,
  InstituteRow,
  InstituteSettingsDto,
  InstituteSettingsRow,
  ListMembershipsFilter,
  MembershipDto,
  MembershipRow,
  ProfileDto,
  UpdateInstituteInput,
  UpdateInstituteSettingsInput,
  UpdateMembershipInput,
  UpdateProfileInput,
  UserProfileRow,
} from "./types.js";

export const MEMBERSHIP_ADMIN_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "it_admin",
] as const;

export const INSTITUTE_SETTINGS_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "it_admin",
] as const;

export const INSTITUTE_UPDATE_ROLES = [
  "institute_admin",
  "principal",
] as const;

export function toInstituteDto(row: InstituteRow): InstituteDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    kind: row.kind,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toSettingsDto(row: InstituteSettingsRow): InstituteSettingsDto {
  return {
    instituteId: row.institute_id,
    timezone: row.timezone,
    locale: row.locale,
    settings: (row.settings ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toProfileDto(row: UserProfileRow): ProfileDto {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMembershipDto(
  row: MembershipRow,
  roles: string[],
): MembershipDto {
  return {
    id: row.id,
    userId: row.user_id,
    instituteId: row.institute_id,
    status: row.status,
    roles,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertMembershipAdmin(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [...MEMBERSHIP_ADMIN_ROLES]);
}

async function requireActiveInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<InstituteRow> {
  const institute = await findInstituteById(admin, instituteId);
  if (!institute) throw AppError.notFound("Institute not found");
  return institute;
}

async function attachRoles(
  admin: SupabaseClient,
  rows: MembershipRow[],
): Promise<MembershipDto[]> {
  const roleRows = await listRolesForMemberships(
    admin,
    rows.map((r) => r.id),
  );
  const byMembership = new Map<string, string[]>();
  for (const r of roleRows) {
    const list = byMembership.get(r.membership_id) ?? [];
    list.push(r.role_code);
    byMembership.set(r.membership_id, list);
  }
  return rows.map((row) => toMembershipDto(row, byMembership.get(row.id) ?? []));
}

async function assertValidRoles(
  admin: SupabaseClient,
  roles: string[],
): Promise<void> {
  if (roles.length === 0) {
    throw AppError.validation("At least one role is required", {
      roles: ["Required"],
    });
  }
  const unique = [...new Set(roles)];
  if (unique.length !== roles.length) {
    throw AppError.validation("roles must be unique", {
      roles: ["Duplicate role codes"],
    });
  }
  const catalog = await listAssignableRoleCodes(admin);
  const unknown = unique.filter((r) => !catalog.has(r));
  if (unknown.length > 0) {
    throw AppError.validation("Referenced resource is invalid", {
      roles: [`Unknown role codes: ${unknown.join(", ")}`],
    });
  }
}

// ── Institutes ───────────────────────────────────────────────────

export async function listInstitutesForActor(
  admin: SupabaseClient,
  actor: Actor,
): Promise<InstituteDto[]> {
  if (actor.isPlatformOperator) {
    const rows = await listInstitutes(admin);
    return rows.map(toInstituteDto);
  }
  const ids = actor.memberships.map((m) => m.instituteId);
  const rows = await listInstitutes(admin, ids);
  return rows.map(toInstituteDto);
}

export async function getInstituteForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<InstituteDto> {
  const row = await findInstituteById(admin, instituteId);
  if (!row) throw AppError.notFound("Institute not found");

  assertInstituteAccess(actor, row.id);
  return toInstituteDto(row);
}

export async function createInstituteForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateInstituteInput,
): Promise<InstituteDto> {
  assertPlatformOperator(actor);

  const code = input.code.trim();
  const name = input.name.trim();
  if (!code || !name) {
    throw AppError.validation("code and name are required", {
      code: !code ? ["Required"] : undefined,
      name: !name ? ["Required"] : undefined,
    });
  }

  const row = await insertInstitute(admin, { ...input, code, name });
  await insertInstituteSettings(admin, {
    instituteId: row.id,
    timezone: input.timezone,
    locale: input.locale,
  });
  return toInstituteDto(row);
}

export async function updateInstituteForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  patch: UpdateInstituteInput,
): Promise<InstituteDto> {
  const existing = await findInstituteById(admin, instituteId);
  if (!existing) throw AppError.notFound("Institute not found");

  if (actor.isPlatformOperator) {
    // full update including code
  } else {
    assertInstituteRoles(actor, instituteId, [...INSTITUTE_UPDATE_ROLES]);
    if (patch.code !== undefined) {
      throw AppError.forbidden("Only platform operators may change institute code");
    }
  }

  const fieldPatch = toInstituteUpdatePatch(patch);
  if (typeof fieldPatch.name === "string") fieldPatch.name = fieldPatch.name.trim();
  if (typeof fieldPatch.code === "string") fieldPatch.code = fieldPatch.code.trim();

  if (Object.keys(fieldPatch).length === 0) {
    return toInstituteDto(existing);
  }

  const updated = await updateInstituteFields(admin, instituteId, fieldPatch);
  if (!updated) throw AppError.notFound("Institute not found");
  return toInstituteDto(updated);
}

export async function deleteInstituteForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<void> {
  assertPlatformOperator(actor);
  const existing = await findInstituteById(admin, instituteId);
  if (!existing) throw AppError.notFound("Institute not found");

  await softDeleteMembershipsForInstitute(admin, instituteId);

  const deleted = await softDeleteInstitute(admin, instituteId);
  if (!deleted) throw AppError.conflict("Institute was already deleted");
}

export async function getInstituteSettingsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<InstituteSettingsDto> {
  await requireActiveInstitute(admin, instituteId);
  assertInstituteAccess(actor, instituteId);
  const row = await findInstituteSettings(admin, instituteId);
  if (!row) throw AppError.notFound("Institute settings not found");
  return toSettingsDto(row);
}

export async function updateInstituteSettingsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  patch: UpdateInstituteSettingsInput,
): Promise<InstituteSettingsDto> {
  await requireActiveInstitute(admin, instituteId);
  requireInstituteId(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [...INSTITUTE_SETTINGS_WRITE_ROLES]);

  const existing = await findInstituteSettings(admin, instituteId);
  if (!existing) throw AppError.notFound("Institute settings not found");

  const fieldPatch = toSettingsUpdatePatch(patch);
  if (Object.keys(fieldPatch).length === 0) {
    return toSettingsDto(existing);
  }

  const updated = await updateInstituteSettingsFields(
    admin,
    instituteId,
    fieldPatch,
  );
  if (!updated) throw AppError.notFound("Institute settings not found");
  return toSettingsDto(updated);
}

// ── Profiles ─────────────────────────────────────────────────────

export async function getProfileForActor(
  admin: SupabaseClient,
  actor: Actor,
  profileId: string,
): Promise<ProfileDto> {
  if (profileId !== actor.userId && !actor.isPlatformOperator) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const row = await findProfileById(admin, profileId);
  if (!row) throw AppError.notFound("Profile not found");
  return toProfileDto(row);
}

export async function updateOwnProfileForActor(
  admin: SupabaseClient,
  actor: Actor,
  patch: UpdateProfileInput,
): Promise<ProfileDto> {
  const existing = await findProfileById(admin, actor.userId);
  if (!existing) throw AppError.notFound("Profile not found");

  const fieldPatch = toProfileUpdatePatch(patch);
  if (typeof fieldPatch.display_name === "string") {
    fieldPatch.display_name = fieldPatch.display_name.trim();
    if (!fieldPatch.display_name) {
      throw AppError.validation("display_name is required", {
        display_name: ["Required"],
      });
    }
  }

  if (Object.keys(fieldPatch).length === 0) {
    return toProfileDto(existing);
  }

  const updated = await updateProfileFields(admin, actor.userId, fieldPatch);
  if (!updated) throw AppError.notFound("Profile not found");
  return toProfileDto(updated);
}

// ── Memberships ──────────────────────────────────────────────────

export async function listMembershipsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListMembershipsFilter,
): Promise<MembershipDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  await requireActiveInstitute(admin, instituteId);
  assertMembershipAdmin(actor, instituteId);

  const rows = await listMemberships(admin, { ...filter, instituteId });
  return attachRoles(admin, rows);
}

export async function getMembershipForActor(
  admin: SupabaseClient,
  actor: Actor,
  membershipId: string,
): Promise<MembershipDto> {
  const row = await findMembershipById(admin, membershipId);
  if (!row) throw AppError.notFound("Membership not found");

  const isOwn = row.user_id === actor.userId;
  if (!isOwn) {
    assertMembershipAdmin(actor, row.institute_id);
  } else {
    assertInstituteAccess(actor, row.institute_id);
  }

  const [dto] = await attachRoles(admin, [row]);
  return dto;
}

export async function createMembershipForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateMembershipInput,
): Promise<MembershipDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertMembershipAdmin(actor, instituteId);
  await requireActiveInstitute(admin, instituteId);

  const profile = await findProfileById(admin, input.userId);
  if (!profile) {
    throw AppError.validation("Referenced resource is invalid", {
      user_id: ["Profile not found"],
    });
  }

  await assertValidRoles(admin, input.roles);

  const row = await insertMembership(admin, {
    ...input,
    instituteId,
  });
  await replaceMembershipRoles(admin, row.id, [...new Set(input.roles)]);

  const [dto] = await attachRoles(admin, [row]);
  return dto;
}

export async function updateMembershipForActor(
  admin: SupabaseClient,
  actor: Actor,
  membershipId: string,
  patch: UpdateMembershipInput,
): Promise<MembershipDto> {
  const existing = await findMembershipById(admin, membershipId);
  if (!existing) throw AppError.notFound("Membership not found");

  assertMembershipAdmin(actor, existing.institute_id);
  await requireActiveInstitute(admin, existing.institute_id);

  if (patch.roles) {
    await assertValidRoles(admin, patch.roles);
    await replaceMembershipRoles(admin, membershipId, [...new Set(patch.roles)]);
  }

  let row = existing;
  if (patch.status !== undefined) {
    const updated = await updateMembershipFields(admin, membershipId, {
      status: patch.status,
    });
    if (!updated) throw AppError.notFound("Membership not found");
    row = updated;
  }

  const [dto] = await attachRoles(admin, [row]);
  return dto;
}

export async function deleteMembershipForActor(
  admin: SupabaseClient,
  actor: Actor,
  membershipId: string,
): Promise<void> {
  const existing = await findMembershipById(admin, membershipId);
  if (!existing) throw AppError.notFound("Membership not found");

  assertMembershipAdmin(actor, existing.institute_id);
  await requireActiveInstitute(admin, existing.institute_id);

  const deleted = await softDeleteMembership(admin, membershipId);
  if (!deleted) throw AppError.conflict("Membership was already deleted");
}

export async function listRolesForActor(
  admin: SupabaseClient,
  _actor: Actor,
): Promise<Array<{ code: string; label: string; description: string | null }>> {
  const rows = await listAssignableRoles(admin);
  return rows.map((r) => ({
    code: r.code,
    label: r.label,
    description: r.description,
  }));
}
