/**
 * Admin Attendance Pending — derived from Registers only.
 */

import {
  listPendingAttendanceFromRegisters,
  type AttendancePendingExpectation,
} from "@lumenx/module-attendance";

/** Demo classes expected to submit today (section keys are canonical). */
export const ATTENDANCE_PENDING_EXPECTATIONS: AttendancePendingExpectation[] = [
  {
    sectionKey: "10::B",
    classId: "cls-10b-math",
    classLabel: "10-B Mathematics",
    teacherId: "t-mehta",
    teacherName: "A. Mehta",
    studentCount: 32,
  },
  {
    sectionKey: "9::A",
    classId: "cls-9a-math",
    classLabel: "9-A Mathematics",
    teacherId: "t-mehta",
    teacherName: "A. Mehta",
    studentCount: 28,
  },
  {
    sectionKey: "11::A",
    classId: "cls-11a-eng",
    classLabel: "11-A English",
    teacherId: "t-rao",
    teacherName: "S. Rao",
    studentCount: 36,
  },
];

export function loadAttendancePendingFromRegisters(date?: string) {
  const day = (date ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
  return listPendingAttendanceFromRegisters(ATTENDANCE_PENDING_EXPECTATIONS, day);
}
