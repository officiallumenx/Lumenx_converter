import type { TeacherPerformanceDto } from "./types";
import type { TeacherPerformanceLoadStatus } from "./load";

export function resolveTeacherPerformanceListView(input: {
  apiMode: boolean;
  instituteStatus:
    | "demo"
    | "loading"
    | "ready"
    | "needs_selection"
    | "empty"
    | "forbidden"
    | "error";
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedRows: TeacherPerformanceDto[];
  storedStatus: TeacherPerformanceLoadStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
}): {
  status: TeacherPerformanceLoadStatus;
  rows: TeacherPerformanceDto[];
  errorMessage: string | null;
  rowsValid: boolean;
} {
  if (!input.apiMode) {
    return {
      status: "demo",
      rows: input.storedRows,
      errorMessage: null,
      rowsValid: true,
    };
  }
  if (input.instituteStatus === "loading") {
    return { status: "loading", rows: [], errorMessage: null, rowsValid: false };
  }
  if (input.instituteStatus === "error" || input.instituteStatus === "forbidden") {
    return {
      status: input.instituteStatus === "forbidden" ? "forbidden" : "error",
      rows: [],
      errorMessage: input.instituteErrorMessage,
      rowsValid: false,
    };
  }
  if (
    input.instituteStatus === "needs_selection" ||
    input.instituteStatus === "empty" ||
    !input.activeInstituteId
  ) {
    return { status: "needs_institute", rows: [], errorMessage: null, rowsValid: false };
  }
  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return { status: "loading", rows: [], errorMessage: null, rowsValid: false };
  }
  return {
    status: input.storedStatus,
    rows: input.storedRows,
    errorMessage: input.storedErrorMessage,
    rowsValid: input.storedStatus === "ready" || input.storedStatus === "empty",
  };
}

export function shouldCommitTeacherPerformanceLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
