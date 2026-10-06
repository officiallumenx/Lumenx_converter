import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";

export type AcademicYearStatus = "active" | "completed" | "upcoming" | "archived";

export type AcademicYearDto = {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  startsOn: string;
  endsOn: string;
  status: AcademicYearStatus;
  createdAt: string;
  updatedAt: string;
};

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Academic years API is only available in API auth mode");
  }
}

/** Thin GET /api/v1/academic-years client for enrollment history year labels. */
export async function listAcademicYears(
  instituteId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AcademicYearDto[]> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams({ institute_id: instituteId.trim() });
  return client.get<AcademicYearDto[]>(`/api/v1/academic-years?${query.toString()}`);
}
