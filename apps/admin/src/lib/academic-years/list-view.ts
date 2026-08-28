/**
 * Pure helpers for API-mode academic years list validity.
 */
import type { AcademicYearListItem } from "./types";
import type { AcademicYearsListStatus } from "./load";

export type AcademicYearsInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

export type ResolveAcademicYearsListViewInput = {
  apiMode: boolean;
  instituteStatus: AcademicYearsInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedItems: AcademicYearListItem[];
  storedStatus: AcademicYearsListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type AcademicYearsListView = {
  status: AcademicYearsListStatus;
  items: AcademicYearListItem[];
  errorMessage: string | null;
  rowsValid: boolean;
};

export function resolveAcademicYearsListView(
  input: ResolveAcademicYearsListViewInput,
): AcademicYearsListView {
  if (!input.apiMode) {
    return {
      status: "demo",
      items: input.storedItems,
      errorMessage: null,
      rowsValid: true,
    };
  }

  if (input.instituteStatus === "loading") {
    return {
      status: "loading",
      items: [],
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
      errorMessage: null,
      rowsValid: false,
    };
  }

  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return {
      status: "loading",
      items: [],
      errorMessage: null,
      rowsValid: false,
    };
  }

  return {
    status: input.storedStatus,
    items: input.storedItems,
    errorMessage: input.storedErrorMessage,
    rowsValid: true,
  };
}

export function shouldCommitAcademicYearsLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
