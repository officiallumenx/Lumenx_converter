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
  opts?: { removeAssignees?: boolean },
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  const qs = opts?.removeAssignees ? "?remove_assignees=true" : "";
  await client.delete(`/api/v1/access-roles/${roleId}${qs}`);
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
    username: input.username,
    pin: input.pin,
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
  channel?: "email" | "mobile";
}): Promise<{
  maskedDestination: string;
  channel: "email" | "mobile";
  displayName: string;
  devOtp?: string;
  phoneE164?: string;
}> {
  assertApiMode();
  return getAdminApiClient().post(
    "/api/v1/auth/staff/request-otp",
    {
      institute_id: input.instituteId,
      identifier: input.identifier,
      channel: input.channel,
    },
    { skipAuth: true },
  );
}

export async function verifyStaffLogin(input: {
  instituteId: string;
  identifier: string;
  otp?: string;
  mobileOtp?: string;
  emailOtp?: string;
  mobileOtpGrant?: string;
  emailOtpGrant?: string;
  password: string;
  pin: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  instituteId: string;
  displayName: string;
}> {
  assertApiMode();
  const mobileGrant =
    input.mobileOtpGrant && /^[a-f0-9]{64}$/i.test(input.mobileOtpGrant)
      ? input.mobileOtpGrant
      : undefined;
  const emailGrant =
    input.emailOtpGrant &&
    input.emailOtpGrant !== "firebase-email-skipped" &&
    /^[a-f0-9]{64}$/i.test(input.emailOtpGrant)
      ? input.emailOtpGrant
      : undefined;
  const data = await getAdminApiClient().post<{
    access_token: string;
    refresh_token: string;
    institute_id: string;
    display_name: string;
  }>(
    "/api/v1/auth/staff/verify-login",
    {
      institute_id: input.instituteId,
      identifier: input.identifier,
      otp: input.otp,
      mobile_otp: input.mobileOtp,
      email_otp: input.emailOtp,
      ...(mobileGrant ? { mobile_otp_grant: mobileGrant } : {}),
      ...(emailGrant ? { email_otp_grant: emailGrant } : {}),
      password: input.password,
      pin: input.pin,
    },
    { skipAuth: true },
  );
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
  return getAdminApiClient().get<StaffLoginInstituteDto[]>(
    "/api/v1/auth/staff/institutes",
    { skipAuth: true },
  );
}

export async function resolveStaffLoginMode(input: {
  instituteId: string;
  identifier: string;
}): Promise<{
  requiresOtp: boolean;
  requiresDualOtp: boolean;
  requiresPin: boolean;
  firstLogin: boolean;
  displayName: string;
  isAssigned?: boolean;
  isInstituteRoot?: boolean;
}> {
  assertApiMode();
  return getAdminApiClient().post(
    "/api/v1/auth/staff/login-mode",
    {
      institute_id: input.instituteId,
      identifier: input.identifier,
    },
    { skipAuth: true },
  );
}

export async function verifyStaffChannelOtp(input: {
  instituteId: string;
  identifier: string;
  channel: "email" | "mobile";
  otp: string;
}): Promise<{ ok: true; channel: "email" | "mobile"; grant: string; expiresAt: string }> {
  assertApiMode();
  return getAdminApiClient().post(
    "/api/v1/auth/staff/verify-otp",
    {
      institute_id: input.instituteId,
      identifier: input.identifier,
      channel: input.channel,
      otp: input.otp,
    },
    { skipAuth: true },
  );
}

export async function requestStaffPasswordResetOtp(input: {
  instituteId: string;
  identifier: string;
  channel: "email" | "mobile";
}) {
  assertApiMode();
  return getAdminApiClient().post<{
    maskedDestination: string;
    channel: "email" | "mobile";
    displayName: string;
    devOtp?: string;
    phoneE164?: string;
  }>(
    "/api/v1/auth/staff/forgot-password/request-otp",
    {
      institute_id: input.instituteId,
      identifier: input.identifier,
      channel: input.channel,
    },
    { skipAuth: true },
  );
}

export async function verifyStaffPasswordResetOtp(input: {
  instituteId: string;
  identifier: string;
  channel: "email" | "mobile";
  otp: string;
}) {
  assertApiMode();
  return getAdminApiClient().post<{
    ok: true;
    channel: "email" | "mobile";
    grant: string;
    expiresAt: string;
  }>(
    "/api/v1/auth/staff/forgot-password/verify-otp",
    {
      institute_id: input.instituteId,
      identifier: input.identifier,
      channel: input.channel,
      otp: input.otp,
    },
    { skipAuth: true },
  );
}

export async function completeStaffPasswordReset(input: {
  instituteId: string;
  identifier: string;
  mobileOtpGrant: string;
  emailOtpGrant?: string;
  newPassword: string;
}) {
  assertApiMode();
  const emailGrant =
    input.emailOtpGrant &&
    input.emailOtpGrant !== "firebase-email-skipped" &&
    /^[a-f0-9]{64}$/i.test(input.emailOtpGrant)
      ? input.emailOtpGrant
      : undefined;
  return getAdminApiClient().post<{ ok: true }>(
    "/api/v1/auth/staff/forgot-password/complete",
    {
      institute_id: input.instituteId,
      identifier: input.identifier,
      mobile_otp_grant: input.mobileOtpGrant,
      ...(emailGrant ? { email_otp_grant: emailGrant } : {}),
      new_password: input.newPassword,
    },
    { skipAuth: true },
  );
}

export async function requestStaffPinResetOtp(input: {
  instituteId: string;
  identifier: string;
  channel: "email" | "mobile";
}) {
  assertApiMode();
  return getAdminApiClient().post<{
    maskedDestination: string;
    channel: "email" | "mobile";
    displayName: string;
    devOtp?: string;
    phoneE164?: string;
  }>(
    "/api/v1/auth/staff/forgot-pin/request-otp",
    {
      institute_id: input.instituteId,
      identifier: input.identifier,
      channel: input.channel,
    },
    { skipAuth: true },
  );
}

export async function verifyStaffPinResetOtp(input: {
  instituteId: string;
  identifier: string;
  channel: "email" | "mobile";
  otp: string;
}) {
  assertApiMode();
  return getAdminApiClient().post<{
    ok: true;
    channel: "email" | "mobile";
    grant: string;
    expiresAt: string;
  }>(
    "/api/v1/auth/staff/forgot-pin/verify-otp",
    {
      institute_id: input.instituteId,
      identifier: input.identifier,
      channel: input.channel,
      otp: input.otp,
    },
    { skipAuth: true },
  );
}

export async function completeStaffPinReset(input: {
  instituteId: string;
  identifier: string;
  mobileOtpGrant: string;
  emailOtpGrant?: string;
  newPin: string;
}) {
  assertApiMode();
  const emailGrant =
    input.emailOtpGrant &&
    input.emailOtpGrant !== "firebase-email-skipped" &&
    /^[a-f0-9]{64}$/i.test(input.emailOtpGrant)
      ? input.emailOtpGrant
      : undefined;
  return getAdminApiClient().post<{ ok: true }>(
    "/api/v1/auth/staff/forgot-pin/complete",
    {
      institute_id: input.instituteId,
      identifier: input.identifier,
      mobile_otp_grant: input.mobileOtpGrant,
      ...(emailGrant ? { email_otp_grant: emailGrant } : {}),
      new_pin: input.newPin,
    },
    { skipAuth: true },
  );
}

export async function verifyStaffPasswordLogin(input: {
  instituteId: string;
  identifier: string;
  password?: string;
  pin: string;
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
  }>(
    "/api/v1/auth/staff/password-login",
    {
      institute_id: input.instituteId,
      identifier: input.identifier,
      password: input.password,
      pin: input.pin,
    },
    { skipAuth: true },
  );
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    instituteId: data.institute_id,
    displayName: data.display_name,
  };
}
