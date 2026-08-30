/**
 * Dual-mode teachers directory list loader.
 * Demo: never calls API (caller keeps demo seed/store).
 * API: requires validated institute UUID; no demo fallback on failure.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { getTeacher, listTeachers } from "./api";
import { teacherDtoToListItem, teacherDtosToListItems } from "./map";
import type { TeacherListItem } from "./types";

export type TeachersListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type TeachersListState = {
  status: TeachersListStatus;
  items: TeacherListItem[];
  errorMessage: string | null;
};

export type TeacherDetailState = {
  status: TeachersListStatus;
  teacher: TeacherListItem | null;
  errorMessage: string | null;
};

export async function loadTeacherDetail(
  teacherId: string,
  activeInstituteId: string | null = null,
): Promise<TeacherDetailState> {
  if (!isApiAuthMode()) {
    return { status: "demo", teacher: null, errorMessage: null };
  }

  if (!teacherId?.trim() || !isInstituteUuid(teacherId.trim())) {
    return {
      status: "error",
      teacher: null,
      errorMessage: "Teacher id must be a valid UUID.",
    };
  }

  try {
    const dto = await getTeacher(teacherId.trim());
    if (
      activeInstituteId &&
      isInstituteUuid(activeInstituteId) &&
      dto.instituteId !== activeInstituteId
    ) {
      return {
        status: "empty",
        teacher: null,
        errorMessage: "Teacher not found for the active institute.",
      };
    }
    return {
      status: "ready",
      teacher: teacherDtoToListItem(dto),
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
    const message = err instanceof Error ? err.message : "Failed to load teacher";
    if (status === 403) {
      return { status: "forbidden", teacher: null, errorMessage: message };
    }
    if (status === 404) {
      return { status: "empty", teacher: null, errorMessage: "Teacher not found." };
    }
    return { status: "error", teacher: null, errorMessage: message };
  }
}

export async function loadTeachersList(
  activeInstituteId: string | null,
): Promise<TeachersListState> {
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
    const dtos = await listTeachers({ instituteId: activeInstituteId });
    const items = teacherDtosToListItems(dtos);
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
      err instanceof Error ? err.message : "Failed to load teachers";

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
