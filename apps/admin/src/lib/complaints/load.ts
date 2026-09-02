/**
 * Dual-mode complaints list loader.
 * Demo: never calls API (caller keeps demo seed/store).
 * API: requires validated institute UUID; no demo fallback on failure.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listStudents } from "@/lib/students/api";
import { studentDtosToListItems } from "@/lib/students/map";
import { listTeachers } from "@/lib/teachers/api";
import { teacherDtosToListItems } from "@/lib/teachers/map";
import { listComplaints } from "./api";
import {
  buildComplaintEnrichmentContext,
  enrichComplaintDtosToListItems,
} from "./enrich";
import type { ComplaintListItem } from "./types";

export type ComplaintsListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type ComplaintsListState = {
  status: ComplaintsListStatus;
  items: ComplaintListItem[];
  errorMessage: string | null;
};

export async function loadComplaintsList(
  activeInstituteId: string | null,
): Promise<ComplaintsListState> {
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
    const dtos = await listComplaints({ instituteId: activeInstituteId });
    const [students, teachers] = await Promise.all([
      listStudents({ instituteId: activeInstituteId }).then(studentDtosToListItems),
      listTeachers({ instituteId: activeInstituteId }).then(teacherDtosToListItems),
    ]);
    const ctx = buildComplaintEnrichmentContext({ students, teachers });
    const items = enrichComplaintDtosToListItems(dtos, ctx);
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
      err instanceof Error ? err.message : "Failed to load complaints";

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
