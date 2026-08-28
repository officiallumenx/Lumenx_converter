import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listAdmissionApplications } from "./api";
import { admissionApplicationDtosToListItems } from "./map";
import type { AdmissionApplicationListItem } from "./types";

export type AdmissionsListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type AdmissionsListState = {
  status: AdmissionsListStatus;
  items: AdmissionApplicationListItem[];
  errorMessage: string | null;
};

export async function loadAdmissionsList(
  activeInstituteId: string | null,
): Promise<AdmissionsListState> {
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
    const rows = await listAdmissionApplications({ instituteId: activeInstituteId });
    const items = admissionApplicationDtosToListItems(rows);
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
    const message =
      err instanceof Error ? err.message : "Failed to load admissions applications";

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
