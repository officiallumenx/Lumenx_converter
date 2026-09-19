import { listStaffAttendance } from "./api";
import {
  buildTeacherSelfAttendanceSummary,
  defaultStaffAttendanceRangeFrom,
} from "./summary";
import type { TeacherSelfAttendanceSummary } from "./types";

export type TeacherSelfAttendanceLoadResult = {
  status: "ready" | "error" | "empty";
  summary: TeacherSelfAttendanceSummary | null;
  errorMessage: string | null;
};

export async function loadTeacherSelfAttendance(input: {
  instituteId: string;
  teacherId?: string | null;
  from?: string;
  to?: string;
}): Promise<TeacherSelfAttendanceLoadResult> {
  try {
    const to = input.to ?? new Date().toISOString().slice(0, 10);
    const from = input.from ?? defaultStaffAttendanceRangeFrom(90);
    const rows = await listStaffAttendance({
      instituteId: input.instituteId,
      teacherId: input.teacherId ?? undefined,
      from,
      to,
    });
    const summary = buildTeacherSelfAttendanceSummary(rows);
    return {
      status: summary.records.length === 0 ? "empty" : "ready",
      summary,
      errorMessage: null,
    };
  } catch (err) {
    return {
      status: "error",
      summary: null,
      errorMessage:
        err instanceof Error ? err.message : "Failed to load your attendance",
    };
  }
}
