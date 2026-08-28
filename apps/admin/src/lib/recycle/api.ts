/**
 * Recycle bin API repository — API auth mode only.
 * Never called from demo mode; institute UUID validated before any fetch.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { ListRecycleItemsParams, RecycleItemDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Recycle API is only available in API auth mode");
  }
}

export async function listRecycleItems(
  params: ListRecycleItemsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<RecycleItemDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());

  return client.get<RecycleItemDto[]>(
    `/api/v1/recycle/items?${query.toString()}`,
  );
}
