/**
 * Dual-mode subjects catalog list loader.
 * Demo: never calls API (caller keeps demo seed/store).
 * API: requires validated institute UUID; no demo fallback on failure.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listSubjects, getSubject } from "./api";
import { subjectDtosToListItems, subjectDtoToDetailItem } from "./map";
import type { SubjectDetailItem, SubjectListItem } from "./types";

export type SubjectsListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type SubjectsListState = {
  status: SubjectsListStatus;
  items: SubjectListItem[];
  errorMessage: string | null;
};

export type SubjectDetailState = {
  status: SubjectsListStatus;
  subject: SubjectDetailItem | null;
  errorMessage: string | null;
};

export async function loadSubjectDetail(
  subjectId: string,
): Promise<SubjectDetailState> {
  if (!isApiAuthMode()) {
    return { status: "demo", subject: null, errorMessage: null };
  }

  if (!subjectId?.trim()) {
    return { status: "error", subject: null, errorMessage: "Subject id is required." };
  }

  try {
    const dto = await getSubject(subjectId.trim());
    return {
      status: "ready",
      subject: subjectDtoToDetailItem(dto),
      errorMessage: null,
    };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message = err instanceof Error ? err.message : "Failed to load subject";

    if (status === 403) {
      return { status: "forbidden", subject: null, errorMessage: message };
    }
    if (status === 404) {
      return { status: "empty", subject: null, errorMessage: "Subject not found." };
    }
    return { status: "error", subject: null, errorMessage: message };
  }
}

export async function loadSubjectsList(
  activeInstituteId: string | null,
): Promise<SubjectsListState> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      items: [],
      errorMessage: null,
    };
  }

  try {
    const dtos = await listSubjects({ instituteId: activeInstituteId });
    const items = subjectDtosToListItems(dtos);
    return {
      status: items.length === 0 ? "empty" : "ready",
      items,
      errorMessage: null,
    };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message =
      err instanceof Error ? err.message : "Failed to load subjects";

    if (status === 403) {
      return {
        status: "forbidden",
        items: [],
        errorMessage: message,
      };
    }
    return {
      status: "error",
      items: [],
      errorMessage: message,
    };
  }
}
