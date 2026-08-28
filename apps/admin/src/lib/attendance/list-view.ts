import type { AttendanceRegisterListItem } from "./types";
import type { AttendanceListStatus } from "./load";

export type AttendanceInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

type ResolveAttendanceListViewInput = {
  apiMode: boolean;
  instituteStatus: AttendanceInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedItems: AttendanceRegisterListItem[];
  storedStatus: AttendanceListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type AttendanceRegistersListView = {
  status: AttendanceListStatus;
  items: AttendanceRegisterListItem[];
  errorMessage: string | null;
  rowsValid: boolean;
};

function resolveAttendanceListView(
  input: ResolveAttendanceListViewInput,
): AttendanceRegistersListView {
  if (!input.apiMode) {
    return {
      status: "demo",
      items: input.storedItems,
      errorMessage: null,
      rowsValid: true,
    };
  }

  if (input.instituteStatus === "loading") {
    return { status: "loading", items: [], errorMessage: null, rowsValid: false };
  }

  if (input.instituteStatus === "error" || input.instituteStatus === "forbidden") {
    return {
      status: input.instituteStatus === "forbidden" ? "forbidden" : "error",
      items: [],
      errorMessage: input.instituteErrorMessage,
      rowsValid: false,
    };
  }

  if (
    input.instituteStatus === "needs_selection" ||
    input.instituteStatus === "empty" ||
    !input.activeInstituteId
  ) {
    return { status: "needs_institute", items: [], errorMessage: null, rowsValid: false };
  }

  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return { status: "loading", items: [], errorMessage: null, rowsValid: false };
  }

  return {
    status: input.storedStatus,
    items: input.storedItems,
    errorMessage: input.storedErrorMessage,
    rowsValid: true,
  };
}

export function resolveAttendanceRegistersListView(
  input: ResolveAttendanceListViewInput,
): AttendanceRegistersListView {
  return resolveAttendanceListView(input);
}

export function shouldCommitAttendanceRegistersLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
  requestKey: string;
  activeKey: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  if (opts.requestInstituteId !== opts.activeInstituteId) return false;
  return opts.requestKey === opts.activeKey;
}
