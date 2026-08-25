/**
 * Map teacher/admin roster local ids ↔ canonical Attendance student ids.
 */

import {
  canonicalAttendanceRoll,
  parseAttendanceStudentId,
  toAttendanceStudentId,
} from "@lumenx/module-attendance";

export type AttendanceRosterRef = {
  id: string;
  roll: string;
  className: string;
  section: string;
};

export function localIdsToAttendanceStudentIds(
  localIds: readonly string[],
  roster: readonly AttendanceRosterRef[],
): string[] {
  const byId = new Map(roster.map((s) => [s.id, s]));
  return localIds.map((id) => {
    const s = byId.get(id);
    if (!s) return id;
    return toAttendanceStudentId({
      id: s.id,
      classLabel: s.className,
      section: s.section,
      rollNo: s.roll,
    });
  });
}

export function attendanceStudentIdsToLocalIds(
  attendanceIds: readonly string[],
  roster: readonly AttendanceRosterRef[],
): string[] {
  const byRoll = new Map(
    roster.map((s) => [canonicalAttendanceRoll(s.roll), s.id]),
  );
  return attendanceIds.map((id) => {
    const parsed = parseAttendanceStudentId(id);
    if (parsed) {
      const local = byRoll.get(canonicalAttendanceRoll(parsed.rollNo));
      if (local) return local;
    }
    // Legacy cls-* / STU-* / already-local ids
    if (roster.some((s) => s.id === id)) return id;
    return id;
  });
}
