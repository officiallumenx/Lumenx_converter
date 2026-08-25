import { transportSeed } from "@/lib/transport";
import type { AttendanceStudentState } from "@/lib/transport/types";

/** @deprecated Prefer `attendanceRepository` — kept for gradual migration. */
export const attendanceStudentsMock = transportSeed.roster.map((student) => ({ ...student }));

/** @deprecated Prefer `attendanceRepository.getSnapshot()`. */
export function createInitialAttendanceState(): AttendanceStudentState[] {
  return transportSeed.roster.map((student) => ({
    ...student,
    boarding: "pending" as const,
    dropping: "pending" as const,
    boardedAt: null,
    droppedAt: null,
  }));
}
