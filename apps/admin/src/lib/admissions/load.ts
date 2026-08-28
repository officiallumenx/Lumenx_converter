import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import {
  listAdmissionApplications,
  listAdmissionOpenings,
  listAdmissionPrograms,
} from "./api";
import {
  admissionApplicationDtosToListItems,
  admissionOpeningDtosToListItems,
  admissionProgramDtosToListItems,
} from "./map";
import type {
  AdmissionApplicationListItem,
  AdmissionOpeningListItem,
  AdmissionProgramListItem,
} from "./types";

export type AdmissionsListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type AdmissionsProgramsListStatus = AdmissionsListStatus;
export type AdmissionsOpeningsListStatus = AdmissionsListStatus;

export type AdmissionsListState = {
  status: AdmissionsListStatus;
  items: AdmissionApplicationListItem[];
  errorMessage: string | null;
};

export type AdmissionsProgramsListState = {
  status: AdmissionsProgramsListStatus;
  items: AdmissionProgramListItem[];
  errorMessage: string | null;
};

export type AdmissionsOpeningsListState = {
  status: AdmissionsOpeningsListStatus;
  items: AdmissionOpeningListItem[];
  errorMessage: string | null;
};

async function loadAdmissionsResourceList<T>(
  activeInstituteId: string | null,
  fetchRows: (instituteId: string) => Promise<unknown[]>,
  mapRows: (rows: unknown[]) => T[],
  errorLabel: string,
): Promise<{ status: AdmissionsListStatus; items: T[]; errorMessage: string | null }> {
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

export async function loadAdmissionsList(
  activeInstituteId: string | null,
): Promise<AdmissionsListState> {
  const result = await loadAdmissionsResourceList(
    activeInstituteId,
    (instituteId) => listAdmissionApplications({ instituteId }),
    (rows) =>
      admissionApplicationDtosToListItems(
        rows as Parameters<typeof admissionApplicationDtosToListItems>[0],
      ),
    "Failed to load admissions applications",
  );
  return result;
}

export async function loadAdmissionsProgramsList(
  activeInstituteId: string | null,
): Promise<AdmissionsProgramsListState> {
  return loadAdmissionsResourceList(
    activeInstituteId,
    (instituteId) => listAdmissionPrograms({ instituteId }),
    (rows) =>
      admissionProgramDtosToListItems(
        rows as Parameters<typeof admissionProgramDtosToListItems>[0],
      ),
    "Failed to load admission programs",
  );
}

export async function loadAdmissionsOpeningsList(
  activeInstituteId: string | null,
): Promise<AdmissionsOpeningsListState> {
  return loadAdmissionsResourceList(
    activeInstituteId,
    (instituteId) => listAdmissionOpenings({ instituteId }),
    (rows) =>
      admissionOpeningDtosToListItems(
        rows as Parameters<typeof admissionOpeningDtosToListItems>[0],
      ),
    "Failed to load admission openings",
  );
}
