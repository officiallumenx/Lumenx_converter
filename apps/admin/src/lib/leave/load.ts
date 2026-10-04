/**
 * Dual-mode leave list loader.
 * Demo: never calls API (caller keeps demo seed/store).
 * API: requires validated institute UUID; no demo fallback on failure.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listClassesCatalog } from "@/lib/classes/api";
import {
  listStudentsCached,
  listTeachersCached,
} from "@/lib/directory-lists-cache";
import { studentDtosToListItems } from "@/lib/students/map";
import { teacherDtosToListItems } from "@/lib/teachers/map";
import { listLeaveRequests } from "./api";
import {
  buildLeaveEnrichmentContext,
  enrichLeaveDtosToListItems,
  emptyLeaveEnrichmentContext,
} from "./enrich";
import type { LeaveListItem } from "./types";

export type LeaveListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type LeaveListState = {
  status: LeaveListStatus;
  items: LeaveListItem[];
  errorMessage: string | null;
};

export async function loadLeaveRequestsList(
  activeInstituteId: string | null,
): Promise<LeaveListState> {
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
    const dtos = await listLeaveRequests({ instituteId: activeInstituteId });
    if (dtos.length === 0) {
      return { status: "empty", items: [], errorMessage: null };
    }

    const [students, teachers, catalog] = await Promise.all([
      listStudentsCached(activeInstituteId)
        .then(studentDtosToListItems)
        .catch(() => []),
      listTeachersCached(activeInstituteId)
        .then(teacherDtosToListItems)
        .catch(() => []),
      listClassesCatalog({ instituteId: activeInstituteId }).catch(() => ({
        classes: [],
        sections: [],
      })),
    ]);

    const ctx = buildLeaveEnrichmentContext({
      students,
      teachers,
      classes: catalog.classes,
      sections: catalog.sections,
      decisionNotes: new Map(),
    });
    const items = enrichLeaveDtosToListItems(dtos, ctx);
    return {
      status: "ready",
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
      err instanceof Error ? err.message : "Failed to load leave requests";

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

export { emptyLeaveEnrichmentContext };
