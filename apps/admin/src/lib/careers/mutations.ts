/**
 * Careers write API — jobs, applications, inquiries, talent pool, saved items.
 * API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  CareerApplicationDto,
  CareerApplicationStatus,
  CareerEmploymentType,
  CareerJobDto,
  CareerJobStatus,
  CareerWorkMode,
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

export type CreateCareerInquiryInput = {
  instituteId: string;
  category?: "job" | "application" | "recruitment" | "general";
  subject: string;
  body: string;
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export type RespondCareerInquiryInput = {
  status: "responded" | "closed";
  responseNote: string;
};

export type CreateTalentPoolEntryInput = {
  instituteId: string;
  candidateUserId: string;
  notes?: string | null;
};

export type CreateSavedItemInput = {
  instituteId: string;
  itemKind: "career_job";
  itemId: string;
};

export async function createCareerJob(
  input: CreateCareerJobInput,
  client: AdminApiClient = getAdminApiClient(),
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
  client: AdminApiClient = getAdminApiClient(),
): Promise<CareerJobDto> {
  assertApiMode();
  if (!isInstituteUuid(jobId)) {
    throw new Error("job_id must be a valid UUID");
  }
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
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(jobId)) {
    throw new Error("job_id must be a valid UUID");
  }
  await client.delete(`/api/v1/careers/jobs/${jobId.trim()}`);
}

export async function upsertCandidateProfile(
  input: UpsertCandidateProfileInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<unknown> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.put("/api/v1/careers/me/profile", {
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
  client: AdminApiClient = getAdminApiClient(),
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
  client: AdminApiClient = getAdminApiClient(),
): Promise<CareerApplicationDto> {
  assertApiMode();
  if (!isInstituteUuid(applicationId)) {
    throw new Error("application_id must be a valid UUID");
  }
  return client.post<CareerApplicationDto>(
    `/api/v1/careers/applications/${applicationId.trim()}/transition`,
    {
      status: input.status,
      decision_note: input.decisionNote,
    },
  );
}

export async function createCareerInquiry(
  input: CreateCareerInquiryInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<unknown> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post("/api/v1/careers/inquiries", {
    institute_id: input.instituteId.trim(),
    category: input.category,
    subject: input.subject.trim(),
    body: input.body.trim(),
    contact_name: input.contactName.trim(),
    contact_email: input.contactEmail,
    contact_phone: input.contactPhone,
  });
}

export async function respondCareerInquiry(
  inquiryId: string,
  input: RespondCareerInquiryInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<unknown> {
  assertApiMode();
  if (!isInstituteUuid(inquiryId)) {
    throw new Error("inquiry_id must be a valid UUID");
  }
  return client.post(`/api/v1/careers/inquiries/${inquiryId.trim()}/respond`, {
    status: input.status,
    response_note: input.responseNote.trim(),
  });
}

export async function createTalentPoolEntry(
  input: CreateTalentPoolEntryInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<unknown> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.candidateUserId)) {
    throw new Error("candidate_user_id must be a valid UUID");
  }
  return client.post("/api/v1/careers/talent-pool", {
    institute_id: input.instituteId.trim(),
    candidate_user_id: input.candidateUserId.trim(),
    notes: input.notes,
  });
}

export async function deleteTalentPoolEntry(
  entryId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(entryId)) {
    throw new Error("talent_pool_entry_id must be a valid UUID");
  }
  await client.delete(`/api/v1/careers/talent-pool/${entryId.trim()}`);
}

export async function createSavedItem(
  input: CreateSavedItemInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<unknown> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.itemId)) {
    throw new Error("item_id must be a valid UUID");
  }
  return client.post("/api/v1/careers/saved", {
    institute_id: input.instituteId.trim(),
    item_kind: input.itemKind,
    item_id: input.itemId.trim(),
  });
}

export async function deleteSavedItem(
  savedId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(savedId)) {
    throw new Error("saved_item_id must be a valid UUID");
  }
  await client.delete(`/api/v1/careers/saved/${savedId.trim()}`);
}
