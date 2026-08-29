/**
 * Identity memberships write API — create / update / delete. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { MembershipDto, MembershipStatus } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Identity API is only available in API auth mode");
  }
}

export type CreateMembershipInput = {
  instituteId: string;
  userId: string;
  roles: string[];
  status?: MembershipStatus;
};

export type UpdateMembershipInput = {
  status?: MembershipStatus;
  roles?: string[];
};

function toCreateBody(input: CreateMembershipInput): Record<string, unknown> {
  return {
    institute_id: input.instituteId.trim(),
    user_id: input.userId.trim(),
    roles: input.roles.map((role) => role.trim()).filter(Boolean),
    status: input.status,
  };
}

function toUpdateBody(input: UpdateMembershipInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.status !== undefined) body.status = input.status;
  if (input.roles !== undefined) {
    body.roles = input.roles.map((role) => role.trim()).filter(Boolean);
  }
  return body;
}

export async function createMembership(
  input: CreateMembershipInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MembershipDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.userId)) {
    throw new Error("user_id must be a valid UUID");
  }
  if (!input.roles.length) {
    throw new Error("At least one role is required");
  }
  return client.post<MembershipDto>("/api/v1/memberships", toCreateBody(input));
}

export async function updateMembership(
  membershipId: string,
  input: UpdateMembershipInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MembershipDto> {
  assertApiMode();
  if (!isInstituteUuid(membershipId)) {
    throw new Error("membership_id must be a valid UUID");
  }
  const body = toUpdateBody(input);
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<MembershipDto>(
    `/api/v1/memberships/${membershipId.trim()}`,
    body,
  );
}

export async function deleteMembership(
  membershipId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(membershipId)) {
    throw new Error("membership_id must be a valid UUID");
  }
  await client.delete(`/api/v1/memberships/${membershipId.trim()}`);
}
