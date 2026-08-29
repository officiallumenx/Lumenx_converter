import type { StorageUsageSummary } from "./types";
import type { AssetsLoadStatus } from "./load";

export function resolveStorageUsageView(input: {
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
  storedSummary: StorageUsageSummary | null;
  storedStatus: AssetsLoadStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
}): {
  status: AssetsLoadStatus;
  summary: StorageUsageSummary | null;
  errorMessage: string | null;
  rowsValid: boolean;
} {
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
  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return { status: "loading", summary: null, errorMessage: null, rowsValid: false };
  }
  return {
    status: input.storedStatus,
    summary: input.storedSummary,
    errorMessage: input.storedErrorMessage,
    rowsValid: true,
  };
}

export function shouldCommitAssetsLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
