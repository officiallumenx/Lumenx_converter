import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import type { JobApplication, JobPosting } from "../types";
import {
  getCareerApplication,
  getCareerJob,
  listCareerApplications,
  listCareerJobs,
} from "./api";
import {
  careerApplicationDtosToJobApplications,
  careerApplicationDtoToJobApplication,
  careerJobDtoToPosting,
  careerJobDtosToPostings,
} from "./map";
import type { CareerApplicationDto, CareerJobDto } from "./types";

export type CareersLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type CareersJobsLoadState = {
  status: CareersLoadStatus;
  items: JobPosting[];
  errorMessage: string | null;
};

export type CareersApplicationsLoadState = {
  status: CareersLoadStatus;
  items: JobApplication[];
  errorMessage: string | null;
};

async function loadCareersResource<T>(
  instituteId: string | null,
  fetchRows: (instituteId: string) => Promise<unknown[]>,
  mapRows: (rows: unknown[]) => T[],
  errorLabel: string,
): Promise<{ status: CareersLoadStatus; items: T[]; errorMessage: string | null }> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }

  if (!instituteId || !isInstituteUuid(instituteId)) {
    return { status: "needs_institute", items: [], errorMessage: null };
  }

  try {
    const rows = await fetchRows(instituteId);
    const items = mapRows(rows);
    return {
      status: items.length === 0 ? "empty" : "ready",
      items,
      errorMessage: null,
    };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message = err instanceof Error ? err.message : errorLabel;

    if (status === 403) {
      return { status: "forbidden", items: [], errorMessage: message };
    }
    return { status: "error", items: [], errorMessage: message };
  }
}

export async function loadCareerJobs(
  instituteId: string | null,
  instituteName = "Institute",
): Promise<CareersJobsLoadState> {
  return loadCareersResource(
    instituteId,
    (id) => listCareerJobs({ instituteId: id }),
    (rows) =>
      careerJobDtosToPostings(rows as CareerJobDto[], instituteName).filter(
        (job) => job.recruiterJobStatus === "open" || job.recruiterJobStatus === undefined,
      ),
    "Failed to load career jobs",
  );
}

export async function loadRecruiterCareerJobs(
  instituteId: string | null,
  instituteName = "Institute",
): Promise<CareersJobsLoadState> {
  return loadCareersResource(
    instituteId,
    (id) => listCareerJobs({ instituteId: id }),
    (rows) => careerJobDtosToPostings(rows as CareerJobDto[], instituteName),
    "Failed to load recruiter jobs",
  );
}

export async function loadCareerJobById(
  jobId: string,
  instituteName = "Institute",
): Promise<{ status: CareersLoadStatus; job: JobPosting | null; errorMessage: string | null }> {
  if (!isApiAuthMode()) {
    return { status: "demo", job: null, errorMessage: null };
  }

  try {
    const dto = await getCareerJob(jobId);
    return {
      status: "ready",
      job: careerJobDtoToPosting(dto, instituteName),
      errorMessage: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load job";
    return { status: "error", job: null, errorMessage: message };
  }
}

export async function loadCareerApplications(
  instituteId: string | null,
  context: {
    candidateId?: string;
    instituteName?: string;
    jobTitleById?: Map<string, string>;
  } = {},
): Promise<CareersApplicationsLoadState> {
  return loadCareersResource(
    instituteId,
    (id) => listCareerApplications({ instituteId: id }),
    (rows) =>
      careerApplicationDtosToJobApplications(rows as CareerApplicationDto[], {
        candidateId: context.candidateId,
        instituteName: context.instituteName,
        jobTitleById: context.jobTitleById,
      }),
    "Failed to load career applications",
  );
}

export async function loadCareerApplicationById(
  applicationId: string,
  context: { candidateId: string; instituteName?: string; jobTitle?: string },
): Promise<{ status: CareersLoadStatus; application: JobApplication | null; errorMessage: string | null }> {
  if (!isApiAuthMode()) {
    return { status: "demo", application: null, errorMessage: null };
  }

  try {
    const dto = await getCareerApplication(applicationId);
    return {
      status: "ready",
      application: careerApplicationDtoToJobApplication(dto, {
        candidateId: context.candidateId,
        instituteName: context.instituteName,
        jobTitle: context.jobTitle,
      }),
      errorMessage: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load application";
    return { status: "error", application: null, errorMessage: message };
  }
}
