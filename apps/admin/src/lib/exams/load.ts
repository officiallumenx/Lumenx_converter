/**
 * Dual-mode exams list loader.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listExams } from "./api";
import { examDtosToCatalog } from "./map";
import { listSubjects } from "@/lib/subjects";
import type { ExamListItem, ExamTimetableListItem } from "./types";

export type ExamsListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type ExamsListState = {
  status: ExamsListStatus;
  items: ExamListItem[];
  timetables: ExamTimetableListItem[];
  errorMessage: string | null;
};

export async function loadExamsList(
  activeInstituteId: string | null,
): Promise<ExamsListState> {
  if (!isApiAuthMode()) {
    return {
      status: "demo",
      items: [],
      timetables: [],
      errorMessage: null,
    };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      items: [],
      timetables: [],
      errorMessage: null,
    };
  }

  try {
    const [rows, subjects] = await Promise.all([
      listExams({ instituteId: activeInstituteId }),
      listSubjects(activeInstituteId),
    ]);
    const subjectLabels = new Map(
      subjects.map((s) => [s.id, s.name?.trim() || s.code?.trim() || s.id]),
    );
    const catalog = examDtosToCatalog(rows, undefined, subjectLabels);
    return {
      status: catalog.items.length === 0 ? "empty" : "ready",
      items: catalog.items,
      timetables: catalog.timetables,
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
      err instanceof Error ? err.message : "Failed to load exams";

    if (status === 403) {
      return {
        status: "forbidden",
        items: [],
        timetables: [],
        errorMessage: message,
      };
    }
    return {
      status: "error",
      items: [],
      timetables: [],
      errorMessage: message,
    };
  }
}
