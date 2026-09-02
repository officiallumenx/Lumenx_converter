import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import { getLearnerTimetable, getTeacherTimetable } from "./api";
import { timetableDtoToWeeklySchedule } from "./map";
import type { WeeklyTimetable } from "./types";

export type TimetableLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "empty"
  | "error"
  | "needs_institute"
  | "forbidden";

export async function loadLearnerTimetable(input: {
  instituteId: string | null;
  studentId: string | null;
}): Promise<{
  status: TimetableLoadStatus;
  schedule: WeeklyTimetable;
  weekdays: string[];
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", schedule: {}, weekdays: [], errorMessage: null };
  }
  if (
    !input.instituteId ||
    !isInstituteUuid(input.instituteId) ||
    !input.studentId ||
    !isInstituteUuid(input.studentId)
  ) {
    return { status: "needs_institute", schedule: {}, weekdays: [], errorMessage: null };
  }

  try {
    const dto = await getLearnerTimetable({
      instituteId: input.instituteId,
      studentId: input.studentId,
    });
    const schedule = timetableDtoToWeeklySchedule(dto);
    const weekdays = dto.weekdays.length > 0 ? dto.weekdays : Object.keys(schedule);
    return {
      status: dto.periods.length === 0 ? "empty" : "ready",
      schedule,
      weekdays,
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
    const message = err instanceof Error ? err.message : "Failed to load timetable";
    if (status === 403) {
      return { status: "forbidden", schedule: {}, weekdays: [], errorMessage: message };
    }
    return { status: "error", schedule: {}, weekdays: [], errorMessage: message };
  }
}

export async function loadTeacherTimetable(input: {
  instituteId: string | null;
  teacherId?: string | null;
  sectionId?: string | null;
}): Promise<{
  status: TimetableLoadStatus;
  schedule: WeeklyTimetable;
  weekdays: string[];
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", schedule: {}, weekdays: [], errorMessage: null };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return { status: "needs_institute", schedule: {}, weekdays: [], errorMessage: null };
  }

  try {
    const dto = await getTeacherTimetable({
      instituteId: input.instituteId,
      teacherId: input.teacherId ?? undefined,
      sectionId: input.sectionId ?? undefined,
    });
    const schedule = timetableDtoToWeeklySchedule(dto);
    const weekdays = dto.weekdays.length > 0 ? dto.weekdays : Object.keys(schedule);
    return {
      status: dto.periods.length === 0 ? "empty" : "ready",
      schedule,
      weekdays,
      errorMessage: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load timetable";
    return { status: "error", schedule: {}, weekdays: [], errorMessage: message };
  }
}
