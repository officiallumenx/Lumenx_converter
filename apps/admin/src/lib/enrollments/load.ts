import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listEnrollments } from "./api";
import { enrollmentDtosToListItems } from "./map";
import type { EnrollmentListItem } from "./types";

export type EnrollmentListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type EnrollmentsListState = {
  status: EnrollmentListStatus;
  items: EnrollmentListItem[];
  errorMessage: string | null;
};

async function mapApiError(
  err: unknown,
): Promise<{ status: EnrollmentListStatus; errorMessage: string }> {
  const status =
    err instanceof ApiClientError
      ? err.status
      : err &&
          typeof err === "object" &&
          "status" in err &&
          typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : null;
  const message = err instanceof Error ? err.message : "Failed to load enrollments";
  if (status === 403) {
    return { status: "forbidden", errorMessage: message };
  }
  return { status: "error", errorMessage: message };
}

export async function loadEnrollmentsList(
  activeInstituteId: string | null,
  filters: {
    sectionId?: string;
    classId?: string;
    academicYearId?: string;
    status?: "active";
  } = {},
): Promise<EnrollmentsListState> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", items: [], errorMessage: null };
  }

  try {
    const rows = await listEnrollments({
      instituteId: activeInstituteId,
      sectionId: filters.sectionId,
      classId: filters.classId,
      academicYearId: filters.academicYearId,
      status: filters.status,
    });
    const items = enrollmentDtosToListItems(rows);
    return {
      status: items.length === 0 ? "empty" : "ready",
      items,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = await mapApiError(err);
    return { status: mapped.status, items: [], errorMessage: mapped.errorMessage };
  }
}
