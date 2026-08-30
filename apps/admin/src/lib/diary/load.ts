/**
 * Dual-mode diary list loader.
 * Demo: never calls API (caller keeps demo seed/store).
 * API: requires validated institute UUID; no demo fallback on failure.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listTeachers } from "@/lib/teachers/api";
import { teacherDtosToListItems } from "@/lib/teachers/map";
import type { TeacherListItem } from "@/lib/teachers/types";
import { listDiaryDays } from "./api";
import { diaryDtosToListItems } from "./map";
import type { DiaryListItem } from "./types";

export type DiaryListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type DiaryListState = {
  status: DiaryListStatus;
  items: DiaryListItem[];
  errorMessage: string | null;
};

export async function loadDiaryDaysList(
  activeInstituteId: string | null,
): Promise<DiaryListState> {
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
    const [dtos, teachers] = await Promise.all([
      listDiaryDays({ instituteId: activeInstituteId }),
      teacherDtosToListItems(await listTeachers({ instituteId: activeInstituteId })),
    ]);
    const teachersById = new Map<string, TeacherListItem>(
      teachers.map((teacher) => [teacher.id, teacher]),
    );
    const items = diaryDtosToListItems(dtos, teachersById);
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
      err instanceof Error ? err.message : "Failed to load diary submissions";

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
