import type { FeesSnapshot } from "@lumenx/module-fees";
import type { FeesLoadStatus } from "./load";

export type FeesInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

export type ResolveFeesLoadViewInput = {
  apiMode: boolean;
  instituteStatus: FeesInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedSnapshot: FeesSnapshot | null;
  storedStatus: FeesLoadStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type FeesLoadView = {
  status: FeesLoadStatus;
  snapshot: FeesSnapshot | null;
  errorMessage: string | null;
  rowsValid: boolean;
};

export function resolveFeesLoadView(input: ResolveFeesLoadViewInput): FeesLoadView {
  if (!input.apiMode) {
    return {
      status: "demo",
      snapshot: input.storedSnapshot,
      errorMessage: null,
      rowsValid: true,
    };
  }

  if (input.instituteStatus === "loading") {
    return {
      status: "loading",
      snapshot: null,
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
      snapshot: null,
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
      snapshot: null,
      errorMessage: null,
      rowsValid: false,
    };
  }

  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return {
      status: "loading",
      snapshot: null,
      errorMessage: null,
      rowsValid: false,
    };
  }

  return {
    status: input.storedStatus,
    snapshot: input.storedSnapshot,
    errorMessage: input.storedErrorMessage,
    rowsValid: input.storedStatus === "ready" && input.storedSnapshot != null,
  };
}

export function shouldCommitFeesLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
