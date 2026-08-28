import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listClassesCatalog } from "@/lib/classes/api";
import { listTimetableSlots } from "./api";
import { buildTimetableReadBundle } from "./map";
import type { TimetableReadBundle } from "./types";

export type TimetableLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type TimetableLoadState = {
  status: TimetableLoadStatus;
  bundle: TimetableReadBundle | null;
  errorMessage: string | null;
};

export async function loadTimetableReadBundle(
  activeInstituteId: string | null,
): Promise<TimetableLoadState> {
  if (!isApiAuthMode()) {
    return { status: "demo", bundle: null, errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      bundle: null,
      errorMessage: null,
    };
  }

  try {
    const [rows, catalog] = await Promise.all([
      listTimetableSlots({ instituteId: activeInstituteId }),
      listClassesCatalog({ instituteId: activeInstituteId }),
    ]);
    const bundle = buildTimetableReadBundle(rows, catalog.sections, catalog.classes);
    return {
      status: bundle.slots.length === 0 ? "empty" : "ready",
      bundle,
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
      err instanceof Error ? err.message : "Failed to load timetable slots";

    if (status === 403) {
      return {
        status: "forbidden",
        bundle: null,
        errorMessage: message,
      };
    }
    return {
      status: "error",
      bundle: null,
      errorMessage: message,
    };
  }
}
