/**
 * Dual-mode leave list loader.
 * Demo: never calls API (caller keeps demo seed/store).
 * API: requires validated institute UUID; no demo fallback on failure.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listClassesCatalog } from "@/lib/classes/api";
import { listStudents } from "@/lib/students/api";
import { studentDtosToListItems } from "@/lib/students/map";
import { listTeachers } from "@/lib/teachers/api";
import { teacherDtosToListItems } from "@/lib/teachers/map";
import { getLeaveDecision, listLeaveRequests } from "./api";
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

async function loadDecisionNotes(
  dtos: Awaited<ReturnType<typeof listLeaveRequests>>,
): Promise<Map<string, string | null>> {
  const decided = dtos.filter((d) => d.status !== "pending" && d.status !== "cancelled");
  const entries = await Promise.all(
    decided.map(async (row) => {
      try {
        const decision = await getLeaveDecision(row.id);
        return [row.id, decision.note] as const;
      } catch {
        return [row.id, null] as const;
      }
    }),
  );
  return new Map(entries);
}

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

    const [students, teachers, catalog, decisionNotes] = await Promise.all([
      listStudents({ instituteId: activeInstituteId }).then(studentDtosToListItems),
      listTeachers({ instituteId: activeInstituteId }).then(teacherDtosToListItems),
      listClassesCatalog({ instituteId: activeInstituteId }),
      loadDecisionNotes(dtos),
    ]);

    const ctx = buildLeaveEnrichmentContext({
      students,
      teachers,
      classes: catalog.classes,
      sections: catalog.sections,
      decisionNotes,
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
