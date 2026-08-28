import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listTeachers } from "@/lib/teachers/api";
import { teacherDtosToListItems } from "@/lib/teachers/map";
import type { TeacherListItem } from "@/lib/teachers/types";
import { listStaffAttendance } from "./api";
import { staffAttendanceDtosToDaySummary } from "./map";
import type { StaffAttendanceDaySummary } from "./types";

export type StaffAttendanceLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type StaffAttendanceDayState = {
  status: StaffAttendanceLoadStatus;
  summary: StaffAttendanceDaySummary | null;
  errorMessage: string | null;
};

async function loadTeachersById(instituteId: string): Promise<Map<string, TeacherListItem>> {
  const rows = teacherDtosToListItems(await listTeachers({ instituteId }));
  return new Map(rows.map((teacher) => [teacher.id, teacher]));
}

export async function loadStaffAttendanceDay(
  activeInstituteId: string | null,
  date: string,
): Promise<StaffAttendanceDayState> {
  if (!isApiAuthMode()) {
    return { status: "demo", summary: null, errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", summary: null, errorMessage: null };
  }

  try {
    const [rows, teachersById] = await Promise.all([
      listStaffAttendance({ instituteId: activeInstituteId, date }),
      loadTeachersById(activeInstituteId),
    ]);
    const summary = staffAttendanceDtosToDaySummary(rows, teachersById, date);
    return {
      status: summary.marks.length === 0 ? "empty" : "ready",
      summary,
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
      err instanceof Error ? err.message : "Failed to load staff attendance";

    if (status === 403) {
      return { status: "forbidden", summary: null, errorMessage: message };
    }
    return { status: "error", summary: null, errorMessage: message };
  }
}
