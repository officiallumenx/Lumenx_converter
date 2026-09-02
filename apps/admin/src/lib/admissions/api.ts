/**
 * Admissions applications API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  AdmissionApplicationDto,
  AdmissionOpeningDto,
  AdmissionProgramDto,
  ListAdmissionApplicationsParams,
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

export async function getAdmissionApplication(
  applicationId: string,
  client: AdminApiClient = getAdminApiClient(),
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
  client: AdminApiClient = getAdminApiClient(),
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

export async function listAdmissionOpenings(
  params: ListAdmissionOpeningsParams,
  client: AdminApiClient = getAdminApiClient(),
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

export async function listAdmissionDocuments(
  applicationId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<import("./types").AdmissionDocumentDto[]> {
  assertApiMode();
  if (!isInstituteUuid(applicationId)) {
    throw new Error("application_id must be a valid UUID");
  }
  return client.get(
    `/api/v1/admissions/applications/${applicationId.trim()}/documents`,
  );
}

export async function getAdmissionDocumentSignedUrl(
  documentId: string,
  expiresInSec?: number,
  client: AdminApiClient = getAdminApiClient(),
): Promise<{ signedUrl: string; expiresAt: string }> {
  assertApiMode();
  if (!isInstituteUuid(documentId)) {
    throw new Error("document_id must be a valid UUID");
  }
  const query = expiresInSec ? `?expires_in=${expiresInSec}` : "";
  return client.get<{ signedUrl: string; expiresAt: string }>(
    `/api/v1/admissions/documents/${documentId.trim()}/signed-url${query}`,
  );
}
