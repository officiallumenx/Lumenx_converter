/**
 * Pure helpers for API-mode class section detail validity.
 * Prevents painting institute A's detail under institute B before effects run.
 */
import type { SectionDetailItem } from "./types";
import type { ClassesListStatus } from "./load";
import type { ClassesInstituteGateStatus } from "./list-view";

export type ResolveSectionDetailViewInput = {
  apiMode: boolean;
  instituteStatus: ClassesInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedSection: SectionDetailItem | null;
  storedStatus: ClassesListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type SectionDetailView = {
  status: ClassesListStatus;
  section: SectionDetailItem | null;
  errorMessage: string | null;
  detailValid: boolean;
};

export function resolveSectionDetailView(
  input: ResolveSectionDetailViewInput,
): SectionDetailView {
  if (!input.apiMode) {
    return {
      status: "demo",
      section: input.storedSection,
      errorMessage: null,
      detailValid: true,
    };
  }

  if (input.instituteStatus === "loading") {
    return {
      status: "loading",
      section: null,
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
      section: null,
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
      section: null,
      errorMessage: null,
      detailValid: false,
    };
  }

  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return {
      status: "loading",
      section: null,
      errorMessage: null,
      detailValid: false,
    };
  }

  return {
    status: input.storedStatus,
    section: input.storedSection,
    errorMessage: input.storedErrorMessage,
    detailValid: true,
  };
}
