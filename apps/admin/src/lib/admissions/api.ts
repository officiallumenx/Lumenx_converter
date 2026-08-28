/**
 * Admissions applications API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { AdmissionApplicationDto, ListAdmissionApplicationsParams } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Admissions API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function listAdmissionApplications(
  params: ListAdmissionApplicationsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AdmissionApplicationDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<AdmissionApplicationDto[]>(
    `/api/v1/admissions/applications?${query.toString()}`,
  );
}
