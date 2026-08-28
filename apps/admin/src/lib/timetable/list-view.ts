import type { TimetableReadBundle } from "./types";
import type { TimetableLoadStatus } from "./load";

export type TimetableInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

export type ResolveTimetableLoadViewInput = {
  apiMode: boolean;
  instituteStatus: TimetableInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedBundle: TimetableReadBundle | null;
  storedStatus: TimetableLoadStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type TimetableLoadView = {
  status: TimetableLoadStatus;
  bundle: TimetableReadBundle | null;
  errorMessage: string | null;
  rowsValid: boolean;
};

export function resolveTimetableLoadView(
  input: ResolveTimetableLoadViewInput,
): TimetableLoadView {
  if (!input.apiMode) {
    return {
      status: "demo",
      bundle: input.storedBundle,
      errorMessage: null,
      rowsValid: true,
    };
  }

  if (input.instituteStatus === "loading") {
    return {
      status: "loading",
      bundle: null,
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
      bundle: null,
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
      bundle: null,
      errorMessage: null,
      rowsValid: false,
    };
  }

  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return {
      status: "loading",
      bundle: null,
      errorMessage: null,
      rowsValid: false,
    };
  }

  return {
    status: input.storedStatus,
    bundle: input.storedBundle,
    errorMessage: input.storedErrorMessage,
    rowsValid: true,
  };
}

export function shouldCommitTimetableLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
