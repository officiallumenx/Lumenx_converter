import type { AnalyticsSummaryDto } from "./types";
import type { AnalyticsLoadStatus } from "./load";

export function resolveAnalyticsSummaryView(input: {
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
  storedSummary: AnalyticsSummaryDto | null;
  storedStatus: AnalyticsLoadStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
}): {
  status: AnalyticsLoadStatus;
  summary: AnalyticsSummaryDto | null;
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
    rowsValid: input.storedStatus === "ready",
  };
}

export function shouldCommitAnalyticsLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
