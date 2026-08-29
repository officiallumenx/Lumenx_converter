/**
 * Academic years write API — create / update / delete. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { AcademicYearDto, AcademicYearStatus } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Academic years API is only available in API auth mode");
  }
}

export type CreateAcademicYearInput = {
  instituteId: string;
  name: string;
  code: string;
  startsOn: string;
  endsOn: string;
  status?: AcademicYearStatus;
};

export type UpdateAcademicYearInput = {
  name?: string;
  code?: string;
  startsOn?: string;
  endsOn?: string;
  status?: AcademicYearStatus;
};

export async function createAcademicYear(
  input: CreateAcademicYearInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AcademicYearDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<AcademicYearDto>("/api/v1/academic-years", {
    institute_id: input.instituteId.trim(),
    name: input.name.trim(),
    code: input.code.trim(),
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    status: input.status,
  });
}

export async function updateAcademicYear(
  yearId: string,
  input: UpdateAcademicYearInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AcademicYearDto> {
  assertApiMode();
  if (!isInstituteUuid(yearId)) {
    throw new Error("academic_year_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.code !== undefined) body.code = input.code.trim();
  if (input.startsOn !== undefined) body.starts_on = input.startsOn;
  if (input.endsOn !== undefined) body.ends_on = input.endsOn;
  if (input.status !== undefined) body.status = input.status;
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<AcademicYearDto>(
    `/api/v1/academic-years/${yearId.trim()}`,
    body,
  );
}

export async function deleteAcademicYear(
  yearId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(yearId)) {
    throw new Error("academic_year_id must be a valid UUID");
  }
  await client.delete(`/api/v1/academic-years/${yearId.trim()}`);
}
