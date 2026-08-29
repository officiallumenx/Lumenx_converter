/**
 * Analytics API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { AnalyticsSummaryDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Analytics API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function getAnalyticsSummary(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AnalyticsSummaryDto> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  return client.get<AnalyticsSummaryDto>(`/api/v1/analytics?${query.toString()}`);
}
