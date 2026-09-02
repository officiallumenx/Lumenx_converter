/**
 * Nexus platform storage usage — API auth mode (real bytes, no quotas).
 */
import { getNexusApiClient } from "@/lib/nexus-api";
import { isNexusApiMode } from "@/lib/auth-mode";
import type { NexusApiClient } from "@/lib/api";
import type { InstituteStorageRowDto, NetworkStorageSummaryDto } from "./types";

function assertApiMode(): void {
  if (!isNexusApiMode()) {
    throw new Error("Nexus storage API is only available in API auth mode");
  }
}

export async function getNetworkStorageSummary(
  client: NexusApiClient = getNexusApiClient(),
): Promise<NetworkStorageSummaryDto> {
  assertApiMode();
  return client.get<NetworkStorageSummaryDto>("/api/nexus/storage/summary");
}

export async function listInstituteStorageUsage(
  client: NexusApiClient = getNexusApiClient(),
): Promise<InstituteStorageRowDto[]> {
  assertApiMode();
  return client.get<InstituteStorageRowDto[]>("/api/nexus/storage/institutes");
}
