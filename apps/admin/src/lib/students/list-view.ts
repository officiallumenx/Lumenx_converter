/**
 * Pure helpers for API-mode students directory list validity.
 * Prevents painting institute A's rows under institute B before effects run.
 */
import { resolveInstituteScopedListView } from "@/lib/admin-queries/institute-list-gate";
import type { StudentListItem } from "./types";
import type { StudentsListStatus } from "./load";

export type StudentsInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

export type ResolveStudentsListViewInput = {
  apiMode: boolean;
  instituteStatus: StudentsInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedItems: StudentListItem[];
  storedStatus: StudentsListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type StudentsListView = {
  status: StudentsListStatus;
  items: StudentListItem[];
  errorMessage: string | null;
  rowsValid: boolean;
};

export function resolveStudentsListView(
  input: ResolveStudentsListViewInput,
): StudentsListView {
  const gated = resolveInstituteScopedListView<StudentsListStatus, StudentListItem>({
    ...input,
    demoStatus: "demo",
    needsInstituteStatus: "needs_institute",
    loadingStatus: "loading",
    errorStatus: "error",
    forbiddenStatus: "forbidden",
  });

  return {
    status: gated.status,
    items: gated.items,
    errorMessage: gated.errorMessage,
    rowsValid: gated.rowsValid,
  };
}

export function shouldCommitStudentsLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
