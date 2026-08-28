/**
 * Pure helpers for API-mode marks list validity.
 */
import type { MarkEntryListItem } from "./types";
import type { MarksListStatus } from "./load";

export type MarksInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

export type ResolveMarksListViewInput = {
  apiMode: boolean;
  instituteStatus: MarksInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedItems: MarkEntryListItem[];
  storedStatus: MarksListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type MarksListView = {
  status: MarksListStatus;
  items: MarkEntryListItem[];
  errorMessage: string | null;
  rowsValid: boolean;
};

export function resolveMarksListView(
  input: ResolveMarksListViewInput,
): MarksListView {
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

export function shouldCommitMarksLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
