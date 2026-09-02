/**
 * Parents write API — create / update / delete + guardian links. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  GuardianLinkDto,
  GuardianLinkStatus,
  GuardianRelationship,
  ParentDto,
  PortalAccessStatus,
  PortalInviteStatus,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Parents API is only available in API auth mode");
  }
}

export type CreateParentInput = {
  instituteId: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  inviteStatus?: PortalInviteStatus;
  accessStatus?: PortalAccessStatus;
  legacyCode?: string | null;
  userProfileId?: string | null;
  password?: string;
  initialLinks?: CreateGuardianLinkInput[];
};

export type UpdateParentInput = Partial<Omit<CreateParentInput, "instituteId" | "userProfileId">>;

export type CreateGuardianLinkInput = {
  studentId: string;
  relationship: GuardianRelationship;
  isPrimary?: boolean;
  isEmergencyContact?: boolean;
  status?: GuardianLinkStatus;
};

export type UpdateGuardianLinkInput = Partial<
  Omit<CreateGuardianLinkInput, "studentId">
>;

function toCreateBody(input: CreateParentInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    institute_id: input.instituteId.trim(),
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    address: input.address?.trim() || null,
    invite_status: input.inviteStatus,
    access_status: input.accessStatus,
    legacy_code: input.legacyCode ?? null,
    user_profile_id: input.userProfileId ?? null,
  };
  if (input.password) body.password = input.password;
  if (input.initialLinks?.length) {
    body.initial_links = input.initialLinks.map((link) => ({
      student_id: link.studentId.trim(),
      relationship: link.relationship,
      is_primary: link.isPrimary,
      is_emergency_contact: link.isEmergencyContact,
    }));
  }
  return body;
}

function toUpdateBody(input: UpdateParentInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.phone !== undefined) body.phone = input.phone.trim();
  if (input.email !== undefined) body.email = input.email?.trim() || null;
  if (input.address !== undefined) body.address = input.address?.trim() || null;
  if (input.inviteStatus !== undefined) body.invite_status = input.inviteStatus;
  if (input.accessStatus !== undefined) body.access_status = input.accessStatus;
  if (input.legacyCode !== undefined) body.legacy_code = input.legacyCode;
  return body;
}

function toCreateLinkBody(input: CreateGuardianLinkInput): Record<string, unknown> {
  return {
    student_id: input.studentId.trim(),
    relationship: input.relationship,
    is_primary: input.isPrimary,
    is_emergency_contact: input.isEmergencyContact,
    status: input.status,
  };
}

function toUpdateLinkBody(input: UpdateGuardianLinkInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.relationship !== undefined) body.relationship = input.relationship;
  if (input.isPrimary !== undefined) body.is_primary = input.isPrimary;
  if (input.isEmergencyContact !== undefined) {
    body.is_emergency_contact = input.isEmergencyContact;
  }
  if (input.status !== undefined) body.status = input.status;
  return body;
}

export async function createParent(
  input: CreateParentInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ParentDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<ParentDto>("/api/v1/parents", toCreateBody(input));
}

export async function updateParent(
  parentId: string,
  input: UpdateParentInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ParentDto> {
  assertApiMode();
  if (!isInstituteUuid(parentId)) {
    throw new Error("parent_id must be a valid UUID");
  }
  const body = toUpdateBody(input);
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<ParentDto>(`/api/v1/parents/${parentId.trim()}`, body);
}

export async function deleteParent(
  parentId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(parentId)) {
    throw new Error("parent_id must be a valid UUID");
  }
  await client.delete(`/api/v1/parents/${parentId.trim()}`);
}

export async function createParentLink(
  parentId: string,
  input: CreateGuardianLinkInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<GuardianLinkDto> {
  assertApiMode();
  if (!isInstituteUuid(parentId)) {
    throw new Error("parent_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.studentId)) {
    throw new Error("student_id must be a valid UUID");
  }
  return client.post<GuardianLinkDto>(
    `/api/v1/parents/${parentId.trim()}/links`,
    toCreateLinkBody(input),
  );
}

export async function updateParentLink(
  parentId: string,
  linkId: string,
  input: UpdateGuardianLinkInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<GuardianLinkDto> {
  assertApiMode();
  if (!isInstituteUuid(parentId)) {
    throw new Error("parent_id must be a valid UUID");
  }
  if (!isInstituteUuid(linkId)) {
    throw new Error("link_id must be a valid UUID");
  }
  const body = toUpdateLinkBody(input);
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<GuardianLinkDto>(
    `/api/v1/parents/${parentId.trim()}/links/${linkId.trim()}`,
    body,
  );
}

export async function deleteParentLink(
  parentId: string,
  linkId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(parentId)) {
    throw new Error("parent_id must be a valid UUID");
  }
  if (!isInstituteUuid(linkId)) {
    throw new Error("link_id must be a valid UUID");
  }
  await client.delete(
    `/api/v1/parents/${parentId.trim()}/links/${linkId.trim()}`,
  );
}

export async function provisionParentAccess(
  parentId: string,
  password: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ParentDto> {
  assertApiMode();
  if (!isInstituteUuid(parentId)) {
    throw new Error("parent_id must be a valid UUID");
  }
  if (password.length < 8) {
    throw new Error("Password must contain at least 8 characters");
  }
  return client.post<ParentDto>(
    `/api/v1/parents/${parentId.trim()}/provision-access`,
    { password },
  );
}
