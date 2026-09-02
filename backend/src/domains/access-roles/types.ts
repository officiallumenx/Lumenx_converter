/** Institute access roles + module ACL. */

export type AccessPermission = "full" | "read" | "none";

export type AccessRoleRow = {
  id: string;
  institute_id: string;
  name: string;
  scope: string;
  description: string | null;
  is_system: boolean;
  system_key: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AccessRolePermissionRow = {
  access_role_id: string;
  module_route: string;
  permission: AccessPermission;
};

export type MembershipAccessAssignmentRow = {
  id: string;
  membership_id: string;
  institute_id: string;
  access_role_id: string;
  linked_teacher_id: string | null;
  linked_staff_id: string | null;
  assigned_section_keys: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AccessRoleDto = {
  id: string;
  instituteId: string;
  name: string;
  scope: string;
  description: string | null;
  isSystem: boolean;
  systemKey: string | null;
  permissions: Record<string, AccessPermission>;
  assigneeCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AccessAssigneeDto = {
  id: string;
  membershipId: string;
  instituteId: string;
  userId: string;
  accessRoleId: string;
  accessRoleName: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  membershipStatus: string;
  linkedTeacherId: string | null;
  linkedStaffId: string | null;
  linkedPersonType: "teacher" | "staff" | null;
  assignedSectionKeys: string[];
  hasLogin: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAccessRoleInput = {
  instituteId: string;
  name: string;
  scope?: string;
  description?: string | null;
  permissions: Record<string, AccessPermission>;
};

export type UpdateAccessRoleInput = {
  name?: string;
  scope?: string;
  description?: string | null;
  permissions?: Record<string, AccessPermission>;
};

export type CreateAccessAssigneeInput = {
  instituteId: string;
  accessRoleId: string;
  password: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  linkedTeacherId?: string | null;
  linkedStaffId?: string | null;
  assignedSectionKeys?: string[];
  membershipStatus?: "active" | "invited" | "suspended";
};

export type UpdateAccessAssigneeInput = {
  accessRoleId?: string;
  password?: string;
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  assignedSectionKeys?: string[];
  membershipStatus?: "active" | "invited" | "suspended";
};

export type EffectivePermissionsDto = {
  accessRoleId: string | null;
  accessRoleName: string | null;
  accessRoleSystemKey: string | null;
  permissions: Record<string, AccessPermission>;
  assignedSectionKeys: string[];
  instituteWide: boolean;
};
