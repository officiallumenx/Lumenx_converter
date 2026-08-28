/**
 * Academic years API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { AcademicYearStatus, AcademicYearDto, ListAcademicYearsParams } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Academic years API is only available in API auth mode");
  }
}

export { assertApiMode };

function buildQuery(params: ListAcademicYearsParams): string {
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.status) {
    query.set("status", params.status);
  }
  return query.toString();
}

export async function listAcademicYears(
  params: ListAcademicYearsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AcademicYearDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.get<AcademicYearDto[]>(
    `/api/v1/academic-years?${buildQuery(params)}`,
  );
}
