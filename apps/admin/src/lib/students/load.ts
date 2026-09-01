/**
 * Dual-mode students directory list loader.
 * Demo: never calls API (caller keeps demo seed/store).
 * API: requires validated institute UUID; no demo fallback on failure.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { getStudent, getStudentGuardians, listStudents } from "./api";
import { studentDtosToListItems, studentDtoToDetailItem } from "./map";
import type {
  ListStudentsParams,
  StudentDetailItem,
  StudentGuardianDto,
  StudentListItem,
} from "./types";

export type StudentsListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type StudentsListState = {
  status: StudentsListStatus;
  items: StudentListItem[];
  errorMessage: string | null;
};

export type StudentDetailState = {
  status: StudentsListStatus;
  student: StudentDetailItem | null;
  errorMessage: string | null;
};

export async function loadStudentDetail(
  studentId: string,
  activeInstituteId: string | null = null,
): Promise<StudentDetailState> {
  if (!isApiAuthMode()) {
    return { status: "demo", student: null, errorMessage: null };
  }

  if (!studentId?.trim()) {
    return { status: "error", student: null, errorMessage: "Student id is required." };
  }

  if (!isInstituteUuid(studentId.trim())) {
    return {
      status: "error",
      student: null,
      errorMessage: "Student id must be a valid UUID.",
    };
  }

  try {
    const dto = await getStudent(studentId.trim());
    if (
      activeInstituteId &&
      isInstituteUuid(activeInstituteId) &&
      dto.instituteId !== activeInstituteId
    ) {
      return {
        status: "empty",
        student: null,
        errorMessage: "Student not found for the active institute.",
      };
    }
    return {
      status: "ready",
      student: studentDtoToDetailItem(dto),
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
    const message = err instanceof Error ? err.message : "Failed to load student";

    if (status === 403) {
      return { status: "forbidden", student: null, errorMessage: message };
    }
    if (status === 404) {
      return { status: "empty", student: null, errorMessage: "Student not found." };
    }
    return { status: "error", student: null, errorMessage: message };
  }
}

export async function loadStudentGuardians(
  studentId: string,
): Promise<{
  status: StudentsListStatus;
  guardians: StudentGuardianDto[];
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", guardians: [], errorMessage: null };
  }
  if (!studentId?.trim() || !isInstituteUuid(studentId.trim())) {
    return { status: "error", guardians: [], errorMessage: "Student id must be a valid UUID." };
  }

  try {
    const guardians = await getStudentGuardians(studentId.trim());
    return { status: "ready", guardians, errorMessage: null };
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
    const message = err instanceof Error ? err.message : "Failed to load guardians";
    if (status === 403) return { status: "forbidden", guardians: [], errorMessage: message };
    if (status === 404) return { status: "empty", guardians: [], errorMessage: "Student not found." };
    return { status: "error", guardians: [], errorMessage: message };
  }
}

export async function loadStudentsList(
  activeInstituteId: string | null,
  filters: Omit<ListStudentsParams, "instituteId"> = {},
): Promise<StudentsListState> {
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
    const dtos = await listStudents({ instituteId: activeInstituteId, ...filters });
    const items = studentDtosToListItems(dtos);
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
      err instanceof Error ? err.message : "Failed to load students";

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
