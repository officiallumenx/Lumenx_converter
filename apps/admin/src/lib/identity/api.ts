/**
 * Identity API repository — memberships, profiles, and roles catalog. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  ListMembershipsParams,
  MembershipDto,
  ProfileDto,
  RoleCatalogItem,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Identity API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function getProfile(
  profileId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ProfileDto> {
  assertApiMode();
  if (!isInstituteUuid(profileId)) {
    throw new Error("profile_id must be a valid UUID");
  }
  return client.get<ProfileDto>(`/api/v1/profiles/${profileId.trim()}`);
}

export async function listMemberships(
  params: ListMembershipsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MembershipDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.status) query.set("status", params.status);
  if (params.userId) {
    if (!isInstituteUuid(params.userId)) {
      throw new Error("user_id must be a valid UUID");
    }
    query.set("user_id", params.userId.trim());
  }
  return client.get<MembershipDto[]>(`/api/v1/memberships?${query.toString()}`);
}

export async function listRoles(
  client: AdminApiClient = getAdminApiClient(),
): Promise<RoleCatalogItem[]> {
  assertApiMode();
  return client.get<RoleCatalogItem[]>("/api/v1/roles");
}
