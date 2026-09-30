/**
 * Pure helpers for API-mode classes directory list validity.
 */
import { resolveInstituteScopedListView } from "@/lib/admin-queries/institute-list-gate";
import type { ClassListItem } from "./types";
import type { ClassesListStatus } from "./load";

export type ClassesInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

export type ResolveClassesListViewInput = {
  apiMode: boolean;
  instituteStatus: ClassesInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedItems: ClassListItem[];
  storedStatus: ClassesListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type ClassesListView = {
  status: ClassesListStatus;
  items: ClassListItem[];
  errorMessage: string | null;
  rowsValid: boolean;
};

export function resolveClassesListView(
  input: ResolveClassesListViewInput,
): ClassesListView {
  const gated = resolveInstituteScopedListView<ClassesListStatus, ClassListItem>({
    ...input,
    demoStatus: "demo",
    needsInstituteStatus: "needs_institute",
    loadingStatus: "loading",
    errorStatus: "error",
    forbiddenStatus: "forbidden",
  });

  if (!gated.passThrough) {
    return {
      status: gated.status,
      items: gated.items,
      errorMessage: gated.errorMessage,
      rowsValid: gated.rowsValid,
    };
  }

  // Soft refresh: keep painting known rows while a forced reload is in flight.
  if (input.storedStatus === "loading" && input.storedItems.length > 0) {
    return {
      status: "loading",
      items: input.storedItems,
      errorMessage: null,
      rowsValid: true,
    };
  }

  const rowsValid =
    input.storedStatus === "ready" || input.storedStatus === "empty";

  return {
    status: input.storedStatus,
    items: rowsValid ? input.storedItems : [],
    errorMessage: input.storedErrorMessage,
    rowsValid,
  };
}

export function shouldCommitClassesLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
