/**
 * Pure helpers for API-mode subject profile detail validity.
 * Prevents painting institute A's detail under institute B before effects run.
 */
import type { SubjectDetailItem } from "./types";
import type { SubjectsListStatus } from "./load";
import type { SubjectsInstituteGateStatus } from "./list-view";

export type ResolveSubjectDetailViewInput = {
  apiMode: boolean;
  instituteStatus: SubjectsInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedSubject: SubjectDetailItem | null;
  storedStatus: SubjectsListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type SubjectDetailView = {
  status: SubjectsListStatus;
  subject: SubjectDetailItem | null;
  errorMessage: string | null;
  detailValid: boolean;
};

export function resolveSubjectDetailView(
  input: ResolveSubjectDetailViewInput,
): SubjectDetailView {
  if (!input.apiMode) {
    return {
      status: "demo",
      subject: input.storedSubject,
      errorMessage: null,
      detailValid: true,
    };
  }

  if (input.instituteStatus === "loading") {
    return {
      status: "loading",
      subject: null,
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
      subject: null,
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
      subject: null,
      errorMessage: null,
      detailValid: false,
    };
  }

  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return {
      status: "loading",
      subject: null,
      errorMessage: null,
      detailValid: false,
    };
  }

  return {
    status: input.storedStatus,
    subject: input.storedSubject,
    errorMessage: input.storedErrorMessage,
    detailValid: true,
  };
}
