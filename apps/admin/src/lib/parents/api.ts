/**
 * Parents directory API repository — API auth mode only.
 * Never called from demo mode; institute UUID validated before any fetch.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { ListParentsParams, ParentDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Parents API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function listParents(
  params: ListParentsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ParentDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());

  return client.get<ParentDto[]>(`/api/v1/parents?${query.toString()}`);
}

export async function getParent(
  parentId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ParentDto> {
  assertApiMode();
  if (!isInstituteUuid(parentId)) {
    throw new Error("parent_id must be a valid UUID");
  }
  return client.get<ParentDto>(`/api/v1/parents/${parentId.trim()}`);
}
