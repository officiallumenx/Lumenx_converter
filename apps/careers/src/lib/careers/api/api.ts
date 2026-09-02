/**
 * Careers REST repository — API auth mode only.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { getCareersApiClient } from "@/lib/careers-api";
import type { CareersApiClient } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import type {
  CareerApplicationDto,
  CareerJobDto,
  CandidateProfileDto,
  ListCareerApplicationsParams,
  ListCareerJobsParams,
  TalentPoolEntryDto,
  UserSavedItemDto,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Careers API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function listCareerJobs(
  params: ListCareerJobsParams,
  client: CareersApiClient = getCareersApiClient(),
): Promise<CareerJobDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<CareerJobDto[]>(`/api/v1/careers/jobs?${query.toString()}`);
}

export async function getCareerJob(
  jobId: string,
  client: CareersApiClient = getCareersApiClient(),
): Promise<CareerJobDto> {
  assertApiMode();
  return client.get<CareerJobDto>(`/api/v1/careers/jobs/${jobId.trim()}`);
}

export async function listCareerApplications(
  params: ListCareerApplicationsParams,
  client: CareersApiClient = getCareersApiClient(),
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

export async function getCareerApplication(
  applicationId: string,
  client: CareersApiClient = getCareersApiClient(),
): Promise<CareerApplicationDto> {
  assertApiMode();
  return client.get<CareerApplicationDto>(
    `/api/v1/careers/applications/${applicationId.trim()}`,
  );
}

export async function getMyCandidateProfile(
  instituteId: string,
  client: CareersApiClient = getCareersApiClient(),
): Promise<CandidateProfileDto | null> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  return client.get<CandidateProfileDto | null>(
    `/api/v1/careers/me/profile?${query.toString()}`,
  );
}

export async function listSavedItems(
  instituteId: string,
  client: CareersApiClient = getCareersApiClient(),
): Promise<UserSavedItemDto[]> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  return client.get<UserSavedItemDto[]>(`/api/v1/careers/saved?${query.toString()}`);
}

export async function listTalentPool(
  instituteId: string,
  client: CareersApiClient = getCareersApiClient(),
): Promise<TalentPoolEntryDto[]> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  return client.get<TalentPoolEntryDto[]>(
    `/api/v1/careers/talent-pool?${query.toString()}`,
  );
}
