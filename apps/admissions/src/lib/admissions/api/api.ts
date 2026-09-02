/**
 * Admissions REST repository — API auth mode only.
 */
import { getAdmissionsApiClient } from "@/lib/admissions-api";
import type { AdmissionsApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type {
  AdmissionApplicationDto,
  AdmissionInquiryDto,
  AdmissionOpeningDto,
  AdmissionProgramDto,
  ListAdmissionApplicationsParams,
  ListAdmissionInquiriesParams,
  ListAdmissionOpeningsParams,
  ListAdmissionProgramsParams,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Admissions API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function listAdmissionApplications(
  params: ListAdmissionApplicationsParams,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
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

export async function getAdmissionApplication(
  applicationId: string,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<AdmissionApplicationDto> {
  assertApiMode();
  if (!isInstituteUuid(applicationId)) {
    throw new Error("application_id must be a valid UUID");
  }
  return client.get<AdmissionApplicationDto>(
    `/api/v1/admissions/applications/${applicationId.trim()}`,
  );
}

export async function listAdmissionPrograms(
  params: ListAdmissionProgramsParams,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<AdmissionProgramDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<AdmissionProgramDto[]>(
    `/api/v1/admissions/programs?${query.toString()}`,
  );
}

export async function getAdmissionProgram(
  programId: string,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<AdmissionProgramDto> {
  assertApiMode();
  if (!isInstituteUuid(programId)) {
    throw new Error("program_id must be a valid UUID");
  }
  return client.get<AdmissionProgramDto>(
    `/api/v1/admissions/programs/${programId.trim()}`,
  );
}

export async function listAdmissionOpenings(
  params: ListAdmissionOpeningsParams,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<AdmissionOpeningDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<AdmissionOpeningDto[]>(
    `/api/v1/admissions/openings?${query.toString()}`,
  );
}

export async function getAdmissionOpening(
  openingId: string,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<AdmissionOpeningDto> {
  assertApiMode();
  if (!isInstituteUuid(openingId)) {
    throw new Error("opening_id must be a valid UUID");
  }
  return client.get<AdmissionOpeningDto>(
    `/api/v1/admissions/openings/${openingId.trim()}`,
  );
}

export async function listAdmissionInquiries(
  params: ListAdmissionInquiriesParams,
  client: AdmissionsApiClient = getAdmissionsApiClient(),
): Promise<AdmissionInquiryDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<AdmissionInquiryDto[]>(
    `/api/v1/admissions/inquiries?${query.toString()}`,
  );
}
