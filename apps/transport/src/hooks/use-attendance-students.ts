import { useSyncExternalStore } from "react";

import {
  attendanceRepository,
  type AttendanceStudentState,
} from "@/lib/transport";

export function useAttendanceStudents(): AttendanceStudentState[] {
  return useSyncExternalStore(
    attendanceRepository.subscribe,
    attendanceRepository.getSnapshot,
    attendanceRepository.getSnapshot,
  );
}
