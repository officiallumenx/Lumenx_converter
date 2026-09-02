import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  AccessAssigneeDto,
  AccessRoleDto,
  CreateAccessAssigneeInput,
  CreateAccessRoleInput,
  EffectivePermissionsDto,
  UpdateAccessAssigneeInput,
  UpdateAccessRoleInput,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Access roles API is only available in API auth mode");
  }
}

export async function listAccessRoles(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AccessRoleDto[]> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) throw new Error("institute_id must be a valid UUID");
  return client.get<AccessRoleDto[]>(
    `/api/v1/access-roles?institute_id=${encodeURIComponent(instituteId.trim())}`,
  );
}

export async function createAccessRole(
  input: CreateAccessRoleInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AccessRoleDto> {
  assertApiMode();
  return client.post<AccessRoleDto>("/api/v1/access-roles", {
    institute_id: input.instituteId,
    name: input.name,
    scope: input.scope,
    description: input.description,
    permissions: input.permissions,
  });
}

export async function updateAccessRole(
  roleId: string,
  input: UpdateAccessRoleInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AccessRoleDto> {
  assertApiMode();
  return client.patch<AccessRoleDto>(`/api/v1/access-roles/${roleId}`, {
    name: input.name,
    scope: input.scope,
    description: input.description,
    permissions: input.permissions,
  });
}

export async function deleteAccessRole(
  roleId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  await client.delete(`/api/v1/access-roles/${roleId}`);
}

export async function listAccessAssignees(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AccessAssigneeDto[]> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) throw new Error("institute_id must be a valid UUID");
  return client.get<AccessAssigneeDto[]>(
    `/api/v1/access-assignees?institute_id=${encodeURIComponent(instituteId.trim())}`,
  );
}

export async function createAccessAssignee(
  input: CreateAccessAssigneeInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AccessAssigneeDto> {
  assertApiMode();
  return client.post<AccessAssigneeDto>("/api/v1/access-assignees", {
    institute_id: input.instituteId,
    access_role_id: input.accessRoleId,
    password: input.password,
    display_name: input.displayName,
    email: input.email,
    phone: input.phone,
    linked_teacher_id: input.linkedTeacherId,
    linked_staff_id: input.linkedStaffId,
    assigned_section_keys: input.assignedSectionKeys,
    membership_status: input.membershipStatus,
  });
}

export async function updateAccessAssignee(
  assigneeId: string,
  input: UpdateAccessAssigneeInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AccessAssigneeDto> {
  assertApiMode();
  return client.patch<AccessAssigneeDto>(`/api/v1/access-assignees/${assigneeId}`, {
    access_role_id: input.accessRoleId,
    password: input.password,
    display_name: input.displayName,
    email: input.email,
    phone: input.phone,
    assigned_section_keys: input.assignedSectionKeys,
    membership_status: input.membershipStatus,
  });
}

export async function deleteAccessAssignee(
  assigneeId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  await client.delete(`/api/v1/access-assignees/${assigneeId}`);
}

export async function fetchMyAccessPermissions(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<EffectivePermissionsDto> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) throw new Error("institute_id must be a valid UUID");
  return client.get<EffectivePermissionsDto>(
    `/api/v1/me/access/permissions?institute_id=${encodeURIComponent(instituteId.trim())}`,
  );
}

export async function requestStaffLoginOtp(input: {
  instituteId: string;
  identifier: string;
}): Promise<{
  maskedDestination: string;
  channel: "email" | "mobile";
  displayName: string;
  devOtp?: string;
}> {
  assertApiMode();
  return getAdminApiClient().post("/api/v1/auth/staff/request-otp", {
    institute_id: input.instituteId,
    identifier: input.identifier,
  });
}

export async function verifyStaffLogin(input: {
  instituteId: string;
  identifier: string;
  otp: string;
  password: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  instituteId: string;
  displayName: string;
}> {
  assertApiMode();
  const data = await getAdminApiClient().post<{
    access_token: string;
    refresh_token: string;
    institute_id: string;
    display_name: string;
  }>("/api/v1/auth/staff/verify-login", {
    institute_id: input.instituteId,
    identifier: input.identifier,
    otp: input.otp,
    password: input.password,
  });
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    instituteId: data.institute_id,
    displayName: data.display_name,
  };
}

export type StaffLoginInstituteDto = {
  id: string;
  name: string;
  code: string;
  kind: string;
};

export async function listStaffLoginInstitutes(): Promise<StaffLoginInstituteDto[]> {
  assertApiMode();
  return getAdminApiClient().get<StaffLoginInstituteDto[]>("/api/v1/auth/staff/institutes");
}

export async function resolveStaffLoginMode(input: {
  instituteId: string;
  identifier: string;
}): Promise<{ requiresOtp: boolean; displayName: string }> {
  assertApiMode();
  return getAdminApiClient().post("/api/v1/auth/staff/login-mode", {
    institute_id: input.instituteId,
    identifier: input.identifier,
  });
}

export async function verifyStaffPasswordLogin(input: {
  instituteId: string;
  identifier: string;
  password: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  instituteId: string;
  displayName: string;
}> {
  assertApiMode();
  const data = await getAdminApiClient().post<{
    access_token: string;
    refresh_token: string;
    institute_id: string;
    display_name: string;
  }>("/api/v1/auth/staff/password-login", {
    institute_id: input.instituteId,
    identifier: input.identifier,
    password: input.password,
  });
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    instituteId: data.institute_id,
    displayName: data.display_name,
  };
}
