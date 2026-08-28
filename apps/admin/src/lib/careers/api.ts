/**
 * Careers applications API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { CareerApplicationDto, ListCareerApplicationsParams } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Careers API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function listCareerApplications(
  params: ListCareerApplicationsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<CareerApplicationDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<CareerApplicationDto[]>(
    `/api/v1/careers/applications?${query.toString()}`,
  );
}
