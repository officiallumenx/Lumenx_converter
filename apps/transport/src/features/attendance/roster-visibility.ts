import type { AttendanceStudentState } from "@/lib/transport";
import type { TripSlot } from "@/lib/transport/trip";
import {
  defaultAttendanceTabForSlot,
  resolveDropStopIdForMark,
  type AttendanceTabId,
} from "@/lib/transport/attendance/drop-stop";

export type { AttendanceTabId };
export { defaultAttendanceTabForSlot, resolveDropStopIdForMark };

/**
 * Pickup and Drop both show every assigned student for the bus/route.
 * Drop must not depend on boarding === "boarded" (evening trips use a new trip_id).
 */
export function rosterForAttendanceTab(
  students: AttendanceStudentState[],
  tab: AttendanceTabId,
): AttendanceStudentState[] {
  void tab;
  return students;
}

/**
 * Evening Drop trip: no "board first" gate (pickup marks live on morning trip_id).
 * Same-trip dropping phase still requires boarded.
 */
export function requiresBoardedBeforeDrop(
  slot: TripSlot | null | undefined,
): boolean {
  return slot !== "evening";
}
