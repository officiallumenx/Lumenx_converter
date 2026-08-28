import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listCareerApplications, listCareerJobs } from "./api";
import {
  careerApplicationDtosToListItems,
  careerJobDtosToListItems,
} from "./map";
import type { CareerApplicationListItem, CareerJobListItem } from "./types";

export type CareersListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type CareersJobsListStatus = CareersListStatus;

export type CareersListState = {
  status: CareersListStatus;
  items: CareerApplicationListItem[];
  errorMessage: string | null;
};

export type CareersJobsListState = {
  status: CareersJobsListStatus;
  items: CareerJobListItem[];
  errorMessage: string | null;
};

async function loadCareersResourceList<T>(
  activeInstituteId: string | null,
  fetchRows: (instituteId: string) => Promise<unknown[]>,
  mapRows: (rows: unknown[]) => T[],
  errorLabel: string,
): Promise<{ status: CareersListStatus; items: T[]; errorMessage: string | null }> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      items: [],
      errorMessage: null,
    };
  }

  try {
    const rows = await fetchRows(activeInstituteId);
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
      return {
        status: "forbidden",
        items: [],
        errorMessage: message,
      };
    }
    return {
      status: "error",
      items: [],
      errorMessage: message,
    };
  }
}

export async function loadCareersList(
  activeInstituteId: string | null,
): Promise<CareersListState> {
  return loadCareersResourceList(
    activeInstituteId,
    (instituteId) => listCareerApplications({ instituteId }),
    (rows) =>
      careerApplicationDtosToListItems(
        rows as Parameters<typeof careerApplicationDtosToListItems>[0],
      ),
    "Failed to load career applications",
  );
}

export async function loadCareerJobsList(
  activeInstituteId: string | null,
): Promise<CareersJobsListState> {
  return loadCareersResourceList(
    activeInstituteId,
    (instituteId) => listCareerJobs({ instituteId }),
    (rows) =>
      careerJobDtosToListItems(rows as Parameters<typeof careerJobDtosToListItems>[0]),
    "Failed to load career jobs",
  );
}
