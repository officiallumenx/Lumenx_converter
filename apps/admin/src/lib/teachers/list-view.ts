/**
 * Pure helpers for API-mode teachers directory list validity.
 * Prevents painting institute A's rows under institute B before effects run.
 */
import { resolveInstituteScopedListView } from "@/lib/admin-queries/institute-list-gate";
import type { TeacherListItem } from "./types";
import type { TeachersListStatus } from "./load";

export type TeachersInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

export type ResolveTeachersListViewInput = {
  apiMode: boolean;
  instituteStatus: TeachersInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedItems: TeacherListItem[];
  storedStatus: TeachersListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type TeachersListView = {
  status: TeachersListStatus;
  items: TeacherListItem[];
  errorMessage: string | null;
  rowsValid: boolean;
};

export function resolveTeachersListView(
  input: ResolveTeachersListViewInput,
): TeachersListView {
  const gated = resolveInstituteScopedListView<TeachersListStatus, TeacherListItem>({
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

  return {
    status: input.storedStatus,
    items: input.storedItems,
    errorMessage: input.storedErrorMessage,
    rowsValid: true,
  };
}

export function shouldCommitTeachersLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
