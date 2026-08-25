/**
 * Attendance pending derived from Registers — not a separate write store.
 */

import { sectionHasSubmittedAttendance } from "./learner-history";
import { normalizeAttendanceSectionKey } from "./identity";

export type AttendancePendingExpectation = {
  sectionKey: string;
  classId: string;
  classLabel: string;
  teacherId: string;
  teacherName: string;
  studentCount: number;
};

export type AttendancePendingRow = AttendancePendingExpectation & {
  date: string;
};

/**
 * Pending = expected classes with no submitted register for `date`.
 * Completing attendance is reflected only by writing registers.
 */
export function listPendingAttendanceFromRegisters(
  expected: readonly AttendancePendingExpectation[],
  date: string,
): AttendancePendingRow[] {
  const day = date.slice(0, 10);
  return expected
    .filter(
      (row) =>
        !sectionHasSubmittedAttendance(
          normalizeAttendanceSectionKey(row.sectionKey),
          day,
        ),
    )
    .map((row) => ({
      ...row,
      sectionKey: normalizeAttendanceSectionKey(row.sectionKey),
      date: day,
    }));
}
