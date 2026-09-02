import type { SupabaseClient } from "@supabase/supabase-js";
import { listMemberships } from "../identity/repository.js";
import type {
  AccessPermission,
  AccessRolePermissionRow,
  AccessRoleRow,
  MembershipAccessAssignmentRow,
} from "./types.js";

const ROLE_COLS =
  "id, institute_id, name, scope, description, is_system, system_key, created_at, updated_at, deleted_at";
const ASSIGNMENT_COLS =
  "id, membership_id, institute_id, access_role_id, linked_teacher_id, linked_staff_id, assigned_section_keys, created_at, updated_at, deleted_at";

export async function listAccessRolesForInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<AccessRoleRow[]> {
  const { data, error } = await admin
    .from("institute_access_role")
    .select(ROLE_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AccessRoleRow[];
}

export async function findAccessRoleById(
  admin: SupabaseClient,
  roleId: string,
): Promise<AccessRoleRow | null> {
  const { data, error } = await admin
    .from("institute_access_role")
    .select(ROLE_COLS)
    .eq("id", roleId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return (data as AccessRoleRow | null) ?? null;
}

export async function findAccessRoleBySystemKey(
  admin: SupabaseClient,
  instituteId: string,
  systemKey: string,
): Promise<AccessRoleRow | null> {
  const { data, error } = await admin
    .from("institute_access_role")
    .select(ROLE_COLS)
    .eq("institute_id", instituteId)
    .eq("system_key", systemKey)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return (data as AccessRoleRow | null) ?? null;
}

export async function insertAccessRole(
  admin: SupabaseClient,
  row: {
    instituteId: string;
    name: string;
    scope: string;
    description: string | null;
    isSystem: boolean;
    systemKey: string | null;
  },
): Promise<AccessRoleRow> {
  const { data, error } = await admin
    .from("institute_access_role")
    .insert({
      institute_id: row.instituteId,
      name: row.name,
      scope: row.scope,
      description: row.description,
      is_system: row.isSystem,
      system_key: row.systemKey,
    })
    .select(ROLE_COLS)
    .single();
  if (error) throw error;
  return data as AccessRoleRow;
}

export async function updateAccessRoleFields(
  admin: SupabaseClient,
  roleId: string,
  patch: Partial<{
    name: string;
    scope: string;
    description: string | null;
  }>,
): Promise<AccessRoleRow | null> {
  const { data, error } = await admin
    .from("institute_access_role")
    .update(patch)
    .eq("id", roleId)
    .is("deleted_at", null)
    .select(ROLE_COLS)
    .maybeSingle();
  if (error) throw error;
  return (data as AccessRoleRow | null) ?? null;
}

export async function softDeleteAccessRole(
  admin: SupabaseClient,
  roleId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("institute_access_role")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", roleId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function listPermissionsForRoles(
  admin: SupabaseClient,
  roleIds: string[],
): Promise<AccessRolePermissionRow[]> {
  if (roleIds.length === 0) return [];
  const { data, error } = await admin
    .from("institute_access_role_permission")
    .select("access_role_id, module_route, permission")
    .in("access_role_id", roleIds);
  if (error) throw error;
  return (data ?? []) as AccessRolePermissionRow[];
}

export async function replaceRolePermissions(
  admin: SupabaseClient,
  roleId: string,
  permissions: Record<string, AccessPermission>,
): Promise<void> {
  const { error: delError } = await admin
    .from("institute_access_role_permission")
    .delete()
    .eq("access_role_id", roleId);
  if (delError) throw delError;

  const rows = Object.entries(permissions).map(([module_route, permission]) => ({
    access_role_id: roleId,
    module_route,
    permission,
  }));
  if (rows.length === 0) return;

  const { error } = await admin.from("institute_access_role_permission").insert(rows);
  if (error) throw error;
}

export async function countAssignmentsForRole(
  admin: SupabaseClient,
  roleId: string,
): Promise<number> {
  const { data, error } = await admin
    .from("membership_access_assignment")
    .select("id")
    .eq("access_role_id", roleId)
    .is("deleted_at", null);
  if (error) throw error;
  return (data ?? []).length;
}

export async function listAccessAssignmentsForInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<MembershipAccessAssignmentRow[]> {
  const { data, error } = await admin
    .from("membership_access_assignment")
    .select(ASSIGNMENT_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as MembershipAccessAssignmentRow[]).map(normalizeAssignmentRow);
}

export async function findAccessAssignmentById(
  admin: SupabaseClient,
  assignmentId: string,
): Promise<MembershipAccessAssignmentRow | null> {
  const { data, error } = await admin
    .from("membership_access_assignment")
    .select(ASSIGNMENT_COLS)
    .eq("id", assignmentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeAssignmentRow(data as MembershipAccessAssignmentRow) : null;
}

export async function findAccessAssignmentByMembershipId(
  admin: SupabaseClient,
  membershipId: string,
): Promise<MembershipAccessAssignmentRow | null> {
  const { data, error } = await admin
    .from("membership_access_assignment")
    .select(ASSIGNMENT_COLS)
    .eq("membership_id", membershipId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeAssignmentRow(data as MembershipAccessAssignmentRow) : null;
}

export async function findAccessAssignmentForUserInstitute(
  admin: SupabaseClient,
  userId: string,
  instituteId: string,
): Promise<MembershipAccessAssignmentRow | null> {
  const memberships = await listMemberships(admin, { instituteId, userId });
  const membership =
    memberships.find((m) => m.status === "active") ??
    memberships.find((m) => m.status !== "ended") ??
    null;
  if (!membership) return null;
  return findAccessAssignmentByMembershipId(admin, membership.id);
}

export async function insertAccessAssignment(
  admin: SupabaseClient,
  row: {
    membershipId: string;
    instituteId: string;
    accessRoleId: string;
    linkedTeacherId: string | null;
    linkedStaffId: string | null;
    assignedSectionKeys: string[];
  },
): Promise<MembershipAccessAssignmentRow> {
  const { data, error } = await admin
    .from("membership_access_assignment")
    .insert({
      membership_id: row.membershipId,
      institute_id: row.instituteId,
      access_role_id: row.accessRoleId,
      linked_teacher_id: row.linkedTeacherId,
      linked_staff_id: row.linkedStaffId,
      assigned_section_keys: row.assignedSectionKeys,
    })
    .select(ASSIGNMENT_COLS)
    .single();
  if (error) throw error;
  return normalizeAssignmentRow(data as MembershipAccessAssignmentRow);
}

export async function updateAccessAssignmentFields(
  admin: SupabaseClient,
  assignmentId: string,
  patch: Partial<{
    access_role_id: string;
    assigned_section_keys: string[];
    linked_teacher_id: string | null;
    linked_staff_id: string | null;
  }>,
): Promise<MembershipAccessAssignmentRow | null> {
  const { data, error } = await admin
    .from("membership_access_assignment")
    .update(patch)
    .eq("id", assignmentId)
    .is("deleted_at", null)
    .select(ASSIGNMENT_COLS)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeAssignmentRow(data as MembershipAccessAssignmentRow) : null;
}

export async function softDeleteAccessAssignment(
  admin: SupabaseClient,
  assignmentId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("membership_access_assignment")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", assignmentId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

function normalizeAssignmentRow(
  row: MembershipAccessAssignmentRow,
): MembershipAccessAssignmentRow {
  const keys = row.assigned_section_keys;
  return {
    ...row,
    assigned_section_keys: Array.isArray(keys) ? keys.map(String) : [],
  };
}

export async function findProfileByEmailOrPhone(
  admin: SupabaseClient,
  input: { email?: string; phone?: string },
): Promise<{
  id: string;
  email: string | null;
  phone: string | null;
  display_name: string;
  status: string;
} | null> {
  if (input.email) {
    const { data, error } = await admin
      .from("user_profile")
      .select("id, email, phone, display_name, status")
      .ilike("email", input.email.trim())
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }
  if (input.phone) {
    const { data, error } = await admin
      .from("user_profile")
      .select("id, email, phone, display_name, status")
      .eq("phone", input.phone.trim())
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }
  return null;
}
