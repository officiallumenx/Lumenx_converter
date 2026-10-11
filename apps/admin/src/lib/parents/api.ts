/**
 * Parents directory API repository — API auth mode only.
 * Never called from demo mode; institute UUID validated before any fetch.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import {
  fetchAllListPages,
  fetchListPage,
  type ListPageResult,
} from "@/lib/api/list-pages";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { ListParentsParams, ParentDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Parents API is only available in API auth mode");
  }
}

export { assertApiMode };

function parentsListPath(params: ListParentsParams, cursor?: string): string {
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  query.set("limit", "100");
  if (params.inviteStatus) query.set("invite_status", params.inviteStatus);
  if (params.accessStatus) query.set("access_status", params.accessStatus);
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (cursor) query.set("cursor", cursor);
  return `/api/v1/parents?${query.toString()}`;
}

export async function listParentsPage(
  params: ListParentsParams & { cursor?: string },
  client: AdminApiClient = getAdminApiClient(),
): Promise<ListPageResult<ParentDto>> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return fetchListPage<ParentDto>(
    client,
    parentsListPath(params, params.cursor),
  );
}

export async function listParents(
  params: ListParentsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ParentDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  return fetchAllListPages<ParentDto>(client, (cursor) =>
    parentsListPath(params, cursor),
  );
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
