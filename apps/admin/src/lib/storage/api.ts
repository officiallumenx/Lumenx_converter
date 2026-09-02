/**
 * Admin storage usage API — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { InstituteStorageUsageDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Storage API is only available in API auth mode");
  }
}

export async function getStorageUsage(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<InstituteStorageUsageDto> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams({ institute_id: instituteId.trim() });
  return client.get<InstituteStorageUsageDto>(
    `/api/v1/storage/usage?${query.toString()}`,
  );
}
