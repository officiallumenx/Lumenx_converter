/**
 * Careers write API — jobs, applications, profiles, saved items.
 * API auth mode only.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { getCareersApiClient } from "@/lib/careers-api";
import type { CareersApiClient } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import type {
  CareerApplicationDto,
  CareerApplicationStatus,
  CareerEmploymentType,
  CareerJobDto,
  CareerJobStatus,
  CareerWorkMode,
  CandidateProfileDto,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Careers API is only available in API auth mode");
  }
}

export type CreateCareerJobInput = {
  instituteId: string;
  title: string;
  slug?: string;
  description?: string | null;
  category?: string;
  employmentType?: CareerEmploymentType;
  workMode?: CareerWorkMode;
  locationLabel?: string | null;
  openingsCount?: number;
  openNow?: boolean;
};

export type UpdateCareerJobInput = Partial<
  Omit<CreateCareerJobInput, "instituteId" | "openNow">
> & {
  status?: CareerJobStatus;
};

export type UpsertCandidateProfileInput = {
  instituteId: string;
  displayName: string;
  headline?: string | null;
  summary?: string | null;
  phone?: string | null;
  email?: string | null;
  payload?: unknown;
};

export type CreateCareerApplicationInput = {
  instituteId: string;
  jobId: string;
  coverLetter?: string | null;
  payload?: unknown;
  submitNow?: boolean;
};

export type TransitionCareerApplicationInput = {
  status: CareerApplicationStatus;
  decisionNote?: string | null;
};

export type CreateSavedItemInput = {
  instituteId: string;
  itemKind: "career_job";
  itemId: string;
};

export async function createCareerJob(
  input: CreateCareerJobInput,
  client: CareersApiClient = getCareersApiClient(),
): Promise<CareerJobDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<CareerJobDto>("/api/v1/careers/jobs", {
    institute_id: input.instituteId.trim(),
    title: input.title.trim(),
    slug: input.slug?.trim(),
    description: input.description,
    category: input.category,
    employment_type: input.employmentType,
    work_mode: input.workMode,
    location_label: input.locationLabel,
    openings_count: input.openingsCount,
    open_now: input.openNow,
  });
}

export async function updateCareerJob(
  jobId: string,
  input: UpdateCareerJobInput,
  client: CareersApiClient = getCareersApiClient(),
): Promise<CareerJobDto> {
  assertApiMode();
  const body: Record<string, unknown> = {};
  if (input.title !== undefined) body.title = input.title.trim();
  if (input.slug !== undefined) body.slug = input.slug.trim();
  if (input.description !== undefined) body.description = input.description;
  if (input.category !== undefined) body.category = input.category;
  if (input.employmentType !== undefined) body.employment_type = input.employmentType;
  if (input.workMode !== undefined) body.work_mode = input.workMode;
  if (input.locationLabel !== undefined) body.location_label = input.locationLabel;
  if (input.openingsCount !== undefined) body.openings_count = input.openingsCount;
  if (input.status !== undefined) body.status = input.status;
  return client.patch<CareerJobDto>(`/api/v1/careers/jobs/${jobId.trim()}`, body);
}

export async function deleteCareerJob(
  jobId: string,
  client: CareersApiClient = getCareersApiClient(),
): Promise<void> {
  assertApiMode();
  await client.delete(`/api/v1/careers/jobs/${jobId.trim()}`);
}

export async function upsertCandidateProfile(
  input: UpsertCandidateProfileInput,
  client: CareersApiClient = getCareersApiClient(),
): Promise<CandidateProfileDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.put<CandidateProfileDto>("/api/v1/careers/me/profile", {
    institute_id: input.instituteId.trim(),
    display_name: input.displayName.trim(),
    headline: input.headline,
    summary: input.summary,
    phone: input.phone,
    email: input.email,
    payload: input.payload,
  });
}

export async function createCareerApplication(
  input: CreateCareerApplicationInput,
  client: CareersApiClient = getCareersApiClient(),
): Promise<CareerApplicationDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.jobId)) {
    throw new Error("job_id must be a valid UUID");
  }
  return client.post<CareerApplicationDto>("/api/v1/careers/applications", {
    institute_id: input.instituteId.trim(),
    job_id: input.jobId.trim(),
    cover_letter: input.coverLetter,
    payload: input.payload,
    submit_now: input.submitNow,
  });
}

export async function transitionCareerApplication(
  applicationId: string,
  input: TransitionCareerApplicationInput,
  client: CareersApiClient = getCareersApiClient(),
): Promise<CareerApplicationDto> {
  assertApiMode();
  return client.post<CareerApplicationDto>(
    `/api/v1/careers/applications/${applicationId.trim()}/transition`,
    {
      status: input.status,
      decision_note: input.decisionNote,
    },
  );
}

export async function createSavedItem(
  input: CreateSavedItemInput,
  client: CareersApiClient = getCareersApiClient(),
): Promise<unknown> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post("/api/v1/careers/saved", {
    institute_id: input.instituteId.trim(),
    item_kind: input.itemKind,
    item_id: input.itemId.trim(),
  });
}

export async function deleteSavedItem(
  savedId: string,
  client: CareersApiClient = getCareersApiClient(),
): Promise<void> {
  assertApiMode();
  await client.delete(`/api/v1/careers/saved/${savedId.trim()}`);
}
