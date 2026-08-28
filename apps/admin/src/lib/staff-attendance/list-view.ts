import type { StaffAttendanceDaySummary } from "./types";
import type { StaffAttendanceLoadStatus } from "./load";

export type StaffAttendanceInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

export type ResolveStaffAttendanceDayViewInput = {
  apiMode: boolean;
  instituteStatus: StaffAttendanceInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  requestDate: string;
  resolvedDate: string | null;
  storedSummary: StaffAttendanceDaySummary | null;
  storedStatus: StaffAttendanceLoadStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type StaffAttendanceDayView = {
  status: StaffAttendanceLoadStatus;
  summary: StaffAttendanceDaySummary | null;
  errorMessage: string | null;
  rowsValid: boolean;
};

export function resolveStaffAttendanceDayView(
  input: ResolveStaffAttendanceDayViewInput,
): StaffAttendanceDayView {
  if (!input.apiMode) {
    return {
      status: "demo",
      summary: input.storedSummary,
      errorMessage: null,
      rowsValid: true,
    };
  }

  if (input.instituteStatus === "loading") {
    return { status: "loading", summary: null, errorMessage: null, rowsValid: false };
  }

  if (input.instituteStatus === "error" || input.instituteStatus === "forbidden") {
    return {
      status: input.instituteStatus === "forbidden" ? "forbidden" : "error",
      summary: null,
      errorMessage: input.instituteErrorMessage,
      rowsValid: false,
    };
  }

  if (
    input.instituteStatus === "needs_selection" ||
    input.instituteStatus === "empty" ||
    !input.activeInstituteId
  ) {
    return { status: "needs_institute", summary: null, errorMessage: null, rowsValid: false };
  }

  if (
    input.resolvedForInstituteId !== input.activeInstituteId ||
    input.resolvedDate !== input.requestDate
  ) {
    return { status: "loading", summary: null, errorMessage: null, rowsValid: false };
  }

  return {
    status: input.storedStatus,
    summary: input.storedSummary,
    errorMessage: input.storedErrorMessage,
    rowsValid: true,
  };
}

export function shouldCommitStaffAttendanceLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
  requestDate: string;
  activeDate: string;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return (
    opts.requestInstituteId === opts.activeInstituteId &&
    opts.requestDate === opts.activeDate
  );
}
