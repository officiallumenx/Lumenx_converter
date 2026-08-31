import { getNexusApiClient } from "@/lib/nexus-api";
import { isNexusApiMode } from "@/lib/auth-mode";
import type { NexusApiClient } from "@/lib/api";
import type { ListPlatformRecycleParams, RecycleItemDto } from "./types";

function assertApiMode(): void {
  if (!isNexusApiMode()) {
    throw new Error("Nexus recycle API is only available in API auth mode");
  }
}

export async function listPlatformRecycleItems(
  params: ListPlatformRecycleParams = {},
  client: NexusApiClient = getNexusApiClient(),
): Promise<RecycleItemDto[]> {
  assertApiMode();
  const query = new URLSearchParams();
  if (params.instituteId?.trim()) {
    query.set("institute_id", params.instituteId.trim());
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return client.get<RecycleItemDto[]>(`/api/nexus/recycle/items${suffix}`);
}
