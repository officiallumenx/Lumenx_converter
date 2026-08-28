/**
 * Pure helpers for API-mode exams list validity.
 */
import type { ExamListItem, ExamTimetableListItem } from "./types";
import type { ExamsListStatus } from "./load";

export type ExamsInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

export type ResolveExamsListViewInput = {
  apiMode: boolean;
  instituteStatus: ExamsInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedItems: ExamListItem[];
  storedTimetables: ExamTimetableListItem[];
  storedStatus: ExamsListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type ExamsListView = {
  status: ExamsListStatus;
  items: ExamListItem[];
  timetables: ExamTimetableListItem[];
  errorMessage: string | null;
  rowsValid: boolean;
};

export function resolveExamsListView(
  input: ResolveExamsListViewInput,
): ExamsListView {
  if (!input.apiMode) {
    return {
      status: "demo",
      items: input.storedItems,
      timetables: input.storedTimetables,
      errorMessage: null,
      rowsValid: true,
    };
  }

  if (input.instituteStatus === "loading") {
    return {
      status: "loading",
      items: [],
      timetables: [],
      errorMessage: null,
      rowsValid: false,
    };
  }

  if (
    input.instituteStatus === "error" ||
    input.instituteStatus === "forbidden"
  ) {
    return {
      status: input.instituteStatus === "forbidden" ? "forbidden" : "error",
      items: [],
      timetables: [],
      errorMessage: input.instituteErrorMessage,
      rowsValid: false,
    };
  }

  if (
    input.instituteStatus === "needs_selection" ||
    input.instituteStatus === "empty" ||
    !input.activeInstituteId
  ) {
    return {
      status: "needs_institute",
      items: [],
      timetables: [],
      errorMessage: null,
      rowsValid: false,
    };
  }

  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return {
      status: "loading",
      items: [],
      timetables: [],
      errorMessage: null,
      rowsValid: false,
    };
  }

  return {
    status: input.storedStatus,
    items: input.storedItems,
    timetables: input.storedTimetables,
    errorMessage: input.storedErrorMessage,
    rowsValid: true,
  };
}

export function shouldCommitExamsLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
