import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { MEMBERSHIP_ADMIN_ROLES } from "../identity/service.js";
import {
  findMembershipById,
  findProfileById,
  insertMembership,
  listMemberships,
  listRolesForMemberships,
  replaceMembershipRoles,
  updateMembershipFields,
} from "../identity/repository.js";
import { findTeacherById, updateTeacherFields } from "../teachers/repository.js";
import { findStaffAccountById, updateStaffAccountFields } from "../staff/repository.js";
import { provisionAuthUser, ensureParentProfile } from "../parents/provision.js";
import { SYSTEM_ACCESS_ROLE_SEEDS } from "./defaults.js";
import { allPermissions, isAdminModuleRoute } from "./module-routes.js";
import {
  countAssignmentsForRole,
  findAccessAssignmentById,
  findAccessAssignmentByMembershipId,
  findAccessRoleById,
  findAccessRoleBySystemKey,
  insertAccessAssignment,
  insertAccessRole,
  listAccessAssignmentsForInstitute,
  listAccessRolesForInstitute,
  listPermissionsForRoles,
  replaceRolePermissions,
  softDeleteAccessAssignment,
  softDeleteAccessRole,
  updateAccessAssignmentFields,
  updateAccessRoleFields,
} from "./repository.js";
import type {
  AccessAssigneeDto,
  AccessPermission,
  AccessRoleDto,
  AccessRoleRow,
  CreateAccessAssigneeInput,
  CreateAccessRoleInput,
  EffectivePermissionsDto,
  MembershipAccessAssignmentRow,
  UpdateAccessAssigneeInput,
  UpdateAccessRoleInput,
} from "./types.js";

const INSTITUTE_WIDE_ROLES = new Set([
  "institute_admin",
  "principal",
  "vice_principal",
  "it_admin",
]);

function assertAccessAdmin(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  assertInstituteRoles(actor, instituteId, [...MEMBERSHIP_ADMIN_ROLES]);
}

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

function normalizePermissions(
  permissions: Record<string, AccessPermission>,
): Record<string, AccessPermission> {
  const out = allPermissions("none");
  for (const [route, permission] of Object.entries(permissions)) {
    if (!isAdminModuleRoute(route)) continue;
    if (permission === "full" || permission === "read" || permission === "none") {
      out[route] = permission;
    }
  }
  return out;
}

function permissionsMapFromRows(
  roleId: string,
  rows: Array<{ access_role_id: string; module_route: string; permission: AccessPermission }>,
): Record<string, AccessPermission> {
  const out = allPermissions("none");
  for (const row of rows) {
    if (row.access_role_id !== roleId) continue;
    if (isAdminModuleRoute(row.module_route)) {
      out[row.module_route] = row.permission;
    }
  }
  return out;
}

function toAccessRoleDto(
  row: AccessRoleRow,
  permissions: Record<string, AccessPermission>,
  assigneeCount: number,
): AccessRoleDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    name: row.name,
    scope: row.scope,
    description: row.description,
    isSystem: row.is_system,
    systemKey: row.system_key,
    permissions,
    assigneeCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function ensureDefaultAccessRoles(
  admin: SupabaseClient,
  instituteId: string,
): Promise<void> {
  for (const seed of SYSTEM_ACCESS_ROLE_SEEDS) {
    const existing = await findAccessRoleBySystemKey(admin, instituteId, seed.systemKey);
    if (existing) continue;
    const created = await insertAccessRole(admin, {
      instituteId,
      name: seed.name,
      scope: seed.scope,
      description: seed.description,
      isSystem: true,
      systemKey: seed.systemKey,
    });
    await replaceRolePermissions(admin, created.id, normalizePermissions(seed.permissions));
  }
}

async function attachRoleDtos(
  admin: SupabaseClient,
  rows: AccessRoleRow[],
): Promise<AccessRoleDto[]> {
  const roleIds = rows.map((r) => r.id);
  const permRows = await listPermissionsForRoles(admin, roleIds);
  const counts = await Promise.all(
    roleIds.map((id) => countAssignmentsForRole(admin, id)),
  );
  return rows.map((row, index) =>
    toAccessRoleDto(
      row,
      permissionsMapFromRows(row.id, permRows),
      counts[index] ?? 0,
    ),
  );
}

export async function listAccessRolesForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<AccessRoleDto[]> {
  assertAccessAdmin(actor, instituteId);
  await ensureDefaultAccessRoles(admin, instituteId);
  const rows = await listAccessRolesForInstitute(admin, instituteId);
  return attachRoleDtos(admin, rows);
}

export async function createAccessRoleForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateAccessRoleInput,
): Promise<AccessRoleDto> {
  assertAccessAdmin(actor, input.instituteId);
  const name = input.name.trim();
  if (!name) {
    throw AppError.validation("name is required", { name: ["Required"] });
  }
  const permissions = normalizePermissions(input.permissions);
  if (!Object.values(permissions).some((p) => p !== "none")) {
    throw AppError.validation("At least one module permission is required", {
      permissions: ["Required"],
    });
  }

  const created = await insertAccessRole(admin, {
    instituteId: input.instituteId,
    name,
    scope: input.scope?.trim() ?? "",
    description: input.description?.trim() ?? null,
    isSystem: false,
    systemKey: null,
  });
  await replaceRolePermissions(admin, created.id, permissions);
  return toAccessRoleDto(created, permissions, 0);
}

export async function updateAccessRoleForActor(
  admin: SupabaseClient,
  actor: Actor,
  roleId: string,
  input: UpdateAccessRoleInput,
): Promise<AccessRoleDto> {
  const existing = await findAccessRoleById(admin, roleId);
  if (!existing) throw AppError.notFound("Access role not found");
  assertAccessAdmin(actor, existing.institute_id);

  const updated = await updateAccessRoleFields(admin, roleId, {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.scope !== undefined ? { scope: input.scope.trim() } : {}),
    ...(input.description !== undefined
      ? { description: input.description?.trim() ?? null }
      : {}),
  });
  if (!updated) throw AppError.notFound("Access role not found");

  if (input.permissions) {
    const permissions = normalizePermissions(input.permissions);
    if (!Object.values(permissions).some((p) => p !== "none")) {
      throw AppError.validation("At least one module permission is required", {
        permissions: ["Required"],
      });
    }
    await replaceRolePermissions(admin, roleId, permissions);
  }

  const permRows = await listPermissionsForRoles(admin, [roleId]);
  const count = await countAssignmentsForRole(admin, roleId);
  return toAccessRoleDto(
    updated,
    permissionsMapFromRows(roleId, permRows),
    count,
  );
}

export async function deleteAccessRoleForActor(
  admin: SupabaseClient,
  actor: Actor,
  roleId: string,
): Promise<void> {
  const existing = await findAccessRoleById(admin, roleId);
  if (!existing) throw AppError.notFound("Access role not found");
  assertAccessAdmin(actor, existing.institute_id);
  if (existing.is_system) {
    throw AppError.forbidden("System roles cannot be deleted");
  }
  const count = await countAssignmentsForRole(admin, roleId);
  if (count > 0) {
    throw AppError.conflict("Role has assigned users and cannot be deleted");
  }
  const ok = await softDeleteAccessRole(admin, roleId);
  if (!ok) throw AppError.notFound("Access role not found");
}

async function resolveAuthEmail(
  email: string | null | undefined,
  phone: string | null | undefined,
  instituteId: string,
): Promise<{ authEmail: string; phoneDigits: string | null }> {
  const cleanEmail = email?.trim().toLowerCase();
  const phoneDigits = phone ? normalizePhoneDigits(phone) : "";
  if (cleanEmail) {
    return { authEmail: cleanEmail, phoneDigits: phoneDigits.length === 10 ? phoneDigits : null };
  }
  if (phoneDigits.length === 10) {
    return {
      authEmail: `staff+${phoneDigits}.${instituteId.slice(0, 8)}@portal.lumenx.local`,
      phoneDigits,
    };
  }
  throw AppError.validation("email or 10-digit phone is required", {
    email: ["Required"],
    phone: ["Required"],
  });
}

async function linkDirectoryProfile(
  admin: SupabaseClient,
  input: {
    linkedTeacherId: string | null;
    linkedStaffId: string | null;
    userId: string;
  },
): Promise<void> {
  if (input.linkedTeacherId) {
    await updateTeacherFields(admin, input.linkedTeacherId, {
      user_profile_id: input.userId,
    });
  }
  if (input.linkedStaffId) {
    await updateStaffAccountFields(admin, input.linkedStaffId, {
      user_profile_id: input.userId,
    });
  }
}

async function assigneeDtoFromRows(
  admin: SupabaseClient,
  assignment: MembershipAccessAssignmentRow,
): Promise<AccessAssigneeDto> {
  const membership = await findMembershipById(admin, assignment.membership_id);
  if (!membership) throw AppError.notFound("Membership not found");
  const profile = await findProfileById(admin, membership.user_id);
  const role = await findAccessRoleById(admin, assignment.access_role_id);

  return {
    id: assignment.id,
    membershipId: assignment.membership_id,
    instituteId: assignment.institute_id,
    userId: membership.user_id,
    accessRoleId: assignment.access_role_id,
    accessRoleName: role?.name ?? "Unknown role",
    displayName: profile?.display_name ?? "User",
    email: profile?.email ?? null,
    phone: profile?.phone ?? null,
    membershipStatus: membership.status,
    linkedTeacherId: assignment.linked_teacher_id,
    linkedStaffId: assignment.linked_staff_id,
    linkedPersonType: assignment.linked_teacher_id
      ? "teacher"
      : assignment.linked_staff_id
        ? "staff"
        : null,
    assignedSectionKeys: assignment.assigned_section_keys,
    hasLogin: Boolean(profile),
    createdAt: assignment.created_at,
    updatedAt: assignment.updated_at,
  };
}

export async function listAccessAssigneesForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<AccessAssigneeDto[]> {
  assertAccessAdmin(actor, instituteId);
  await ensureDefaultAccessRoles(admin, instituteId);
  const assignments = await listAccessAssignmentsForInstitute(admin, instituteId);
  return Promise.all(assignments.map((a) => assigneeDtoFromRows(admin, a)));
}

export async function createAccessAssigneeForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateAccessAssigneeInput,
): Promise<AccessAssigneeDto> {
  assertAccessAdmin(actor, input.instituteId);

  const role = await findAccessRoleById(admin, input.accessRoleId);
  if (!role || role.institute_id !== input.instituteId) {
    throw AppError.notFound("Access role not found");
  }

  if (input.linkedTeacherId) {
    const teacher = await findTeacherById(admin, input.linkedTeacherId);
    if (!teacher || teacher.institute_id !== input.instituteId) {
      throw AppError.notFound("Teacher not found");
    }
  }
  if (input.linkedStaffId) {
    const staff = await findStaffAccountById(admin, input.linkedStaffId);
    if (!staff || staff.institute_id !== input.instituteId) {
      throw AppError.notFound("Staff account not found");
    }
  }

  const password = input.password;
  if (!password || password.length < 8) {
    throw AppError.validation("password must be at least 8 characters", {
      password: ["Too short"],
    });
  }

  const { authEmail, phoneDigits } = await resolveAuthEmail(
    input.email,
    input.phone,
    input.instituteId,
  );

  let userId: string;
  const linkedUserId =
    (input.linkedTeacherId
      ? (await findTeacherById(admin, input.linkedTeacherId))?.user_profile_id
      : null) ??
    (input.linkedStaffId
      ? (await findStaffAccountById(admin, input.linkedStaffId))?.user_profile_id
      : null);

  if (linkedUserId) {
    userId = linkedUserId;
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email: authEmail,
    });
    if (error) {
      throw AppError.validation("Unable to update staff login credentials.");
    }
  } else {
    userId = await provisionAuthUser(admin, authEmail, password);
  }

  await ensureParentProfile(admin, {
    userId,
    displayName: input.displayName.trim() || "Staff",
    email: authEmail,
    phone: phoneDigits ?? "",
  });

  const memberships = await listMemberships(admin, {
    instituteId: input.instituteId,
    userId,
  });
  let membership = memberships[0] ?? null;
  if (!membership) {
    membership = await insertMembership(admin, {
      userId,
      instituteId: input.instituteId,
      status: input.membershipStatus ?? "active",
      roles: ["staff"],
    });
  } else if (input.membershipStatus) {
    membership =
      (await updateMembershipFields(admin, membership.id, {
        status: input.membershipStatus,
      })) ?? membership;
  }

  await replaceMembershipRoles(admin, membership.id, ["staff"]);

  const existingAssignment = await findAccessAssignmentByMembershipId(
    admin,
    membership.id,
  );
  if (existingAssignment) {
    throw AppError.conflict("This user already has an access assignment");
  }

  const assignment = await insertAccessAssignment(admin, {
    membershipId: membership.id,
    instituteId: input.instituteId,
    accessRoleId: input.accessRoleId,
    linkedTeacherId: input.linkedTeacherId ?? null,
    linkedStaffId: input.linkedStaffId ?? null,
    assignedSectionKeys: input.assignedSectionKeys ?? [],
  });

  await linkDirectoryProfile(admin, {
    linkedTeacherId: input.linkedTeacherId ?? null,
    linkedStaffId: input.linkedStaffId ?? null,
    userId,
  });

  return assigneeDtoFromRows(admin, assignment);
}

export async function updateAccessAssigneeForActor(
  admin: SupabaseClient,
  actor: Actor,
  assignmentId: string,
  input: UpdateAccessAssigneeInput,
): Promise<AccessAssigneeDto> {
  const existing = await findAccessAssignmentById(admin, assignmentId);
  if (!existing) throw AppError.notFound("Access assignment not found");
  assertAccessAdmin(actor, existing.institute_id);

  const membership = await findMembershipById(admin, existing.membership_id);
  if (!membership) throw AppError.notFound("Membership not found");

  if (input.accessRoleId) {
    const role = await findAccessRoleById(admin, input.accessRoleId);
    if (!role || role.institute_id !== existing.institute_id) {
      throw AppError.notFound("Access role not found");
    }
  }

  if (input.membershipStatus) {
    await updateMembershipFields(admin, membership.id, {
      status: input.membershipStatus,
    });
  }

  if (input.password || input.email !== undefined || input.phone !== undefined || input.displayName) {
    const profile = await findProfileById(admin, membership.user_id);
    const { authEmail, phoneDigits } = await resolveAuthEmail(
      input.email ?? profile?.email,
      input.phone ?? profile?.phone,
      existing.institute_id,
    );
    const patch: Parameters<typeof admin.auth.admin.updateUserById>[1] = {
      email: authEmail,
    };
    if (input.password) {
      if (input.password.length < 8) {
        throw AppError.validation("password must be at least 8 characters", {
          password: ["Too short"],
        });
      }
      patch.password = input.password;
    }
    const { error } = await admin.auth.admin.updateUserById(membership.user_id, patch);
    if (error) {
      throw AppError.validation("Unable to update login credentials.");
    }
    await ensureParentProfile(admin, {
      userId: membership.user_id,
      displayName: input.displayName?.trim() || profile?.display_name || "Staff",
      email: authEmail,
      phone: phoneDigits ?? profile?.phone ?? "",
    });
  }

  const updated = await updateAccessAssignmentFields(admin, assignmentId, {
    ...(input.accessRoleId ? { access_role_id: input.accessRoleId } : {}),
    ...(input.assignedSectionKeys
      ? { assigned_section_keys: input.assignedSectionKeys }
      : {}),
  });
  if (!updated) throw AppError.notFound("Access assignment not found");
  return assigneeDtoFromRows(admin, updated);
}

export async function deleteAccessAssigneeForActor(
  admin: SupabaseClient,
  actor: Actor,
  assignmentId: string,
): Promise<void> {
  const existing = await findAccessAssignmentById(admin, assignmentId);
  if (!existing) throw AppError.notFound("Access assignment not found");
  assertAccessAdmin(actor, existing.institute_id);
  const ok = await softDeleteAccessAssignment(admin, assignmentId);
  if (!ok) throw AppError.notFound("Access assignment not found");
}

export async function getEffectivePermissionsForUser(
  admin: SupabaseClient,
  userId: string,
  instituteId: string,
): Promise<EffectivePermissionsDto> {
  const memberships = await listMemberships(admin, { instituteId, userId });
  const membership = memberships.find((m) => m.status === "active") ?? memberships[0];
  if (!membership) {
    return {
      accessRoleId: null,
      accessRoleName: null,
      accessRoleSystemKey: null,
      permissions: allPermissions("none"),
      assignedSectionKeys: [],
      instituteWide: false,
    };
  }

  const roleRows = await listRolesForMemberships(admin, [membership.id]);
  const codes = roleRows.map((r) => r.role_code);
  if (codes.some((c) => INSTITUTE_WIDE_ROLES.has(c))) {
    return {
      accessRoleId: null,
      accessRoleName: null,
      accessRoleSystemKey: null,
      permissions: allPermissions("full"),
      assignedSectionKeys: [],
      instituteWide: true,
    };
  }

  const assignment = await findAccessAssignmentByMembershipId(admin, membership.id);
  if (!assignment) {
    return {
      accessRoleId: null,
      accessRoleName: null,
      accessRoleSystemKey: null,
      permissions: allPermissions("none"),
      assignedSectionKeys: [],
      instituteWide: false,
    };
  }

  const role = await findAccessRoleById(admin, assignment.access_role_id);
  const permRows = await listPermissionsForRoles(admin, [assignment.access_role_id]);
  return {
    accessRoleId: assignment.access_role_id,
    accessRoleName: role?.name ?? null,
    accessRoleSystemKey: role?.system_key ?? null,
    permissions: permissionsMapFromRows(assignment.access_role_id, permRows),
    assignedSectionKeys: assignment.assigned_section_keys,
    instituteWide: false,
  };
}

export async function getEffectivePermissionsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<EffectivePermissionsDto> {
  requireInstituteId(actor, instituteId);
  return getEffectivePermissionsForUser(admin, actor.userId, instituteId);
}

