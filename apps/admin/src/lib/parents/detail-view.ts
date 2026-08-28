/**
 * Pure helpers for API-mode parent profile detail validity.
 * Prevents painting institute A's detail under institute B before effects run.
 */
import type { ParentDetailItem } from "./types";
import type { ParentsListStatus } from "./load";
import type { ParentsInstituteGateStatus } from "./list-view";

export type ResolveParentsDetailViewInput = {
  apiMode: boolean;
  instituteStatus: ParentsInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedParent: ParentDetailItem | null;
  storedStatus: ParentsListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type ParentsDetailView = {
  status: ParentsListStatus;
  parent: ParentDetailItem | null;
  errorMessage: string | null;
  detailValid: boolean;
};

export function resolveParentsDetailView(
  input: ResolveParentsDetailViewInput,
): ParentsDetailView {
  if (!input.apiMode) {
    return {
      status: "demo",
      parent: input.storedParent,
      errorMessage: null,
      detailValid: true,
    };
  }

  if (input.instituteStatus === "loading") {
    return {
      status: "loading",
      parent: null,
      errorMessage: null,
      detailValid: false,
    };
  }

  if (
    input.instituteStatus === "error" ||
    input.instituteStatus === "forbidden"
  ) {
    return {
      status: input.instituteStatus === "forbidden" ? "forbidden" : "error",
      parent: null,
      errorMessage: input.instituteErrorMessage,
      detailValid: false,
    };
  }

  if (
    input.instituteStatus === "needs_selection" ||
    input.instituteStatus === "empty" ||
    !input.activeInstituteId
  ) {
    return {
      status: "needs_institute",
      parent: null,
      errorMessage: null,
      detailValid: false,
    };
  }

  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return {
      status: "loading",
      parent: null,
      errorMessage: null,
      detailValid: false,
    };
  }

  return {
    status: input.storedStatus,
    parent: input.storedParent,
    errorMessage: input.storedErrorMessage,
    detailValid: true,
  };
}
