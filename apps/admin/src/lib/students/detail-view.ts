/**
 * Pure helpers for API-mode student profile detail validity.
 * Prevents painting institute A's detail under institute B before effects run.
 */
import type { StudentDetailItem } from "./types";
import type { StudentsListStatus } from "./load";
import type { StudentsInstituteGateStatus } from "./list-view";

export type ResolveStudentsDetailViewInput = {
  apiMode: boolean;
  instituteStatus: StudentsInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedStudent: StudentDetailItem | null;
  storedStatus: StudentsListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type StudentsDetailView = {
  status: StudentsListStatus;
  student: StudentDetailItem | null;
  errorMessage: string | null;
  detailValid: boolean;
};

export function resolveStudentsDetailView(
  input: ResolveStudentsDetailViewInput,
): StudentsDetailView {
  if (!input.apiMode) {
    return {
      status: "demo",
      student: input.storedStudent,
      errorMessage: null,
      detailValid: true,
    };
  }

  if (input.instituteStatus === "loading") {
    return {
      status: "loading",
      student: null,
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
      student: null,
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
      student: null,
      errorMessage: null,
      detailValid: false,
    };
  }

  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return {
      status: "loading",
      student: null,
      errorMessage: null,
      detailValid: false,
    };
  }

  return {
    status: input.storedStatus,
    student: input.storedStudent,
    errorMessage: input.storedErrorMessage,
    detailValid: true,
  };
}
