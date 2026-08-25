/**
 * Pure helpers for Admin Student Attendance mark sheet.
 * Marking I/O stays in the panel (engine open/save only).
 */

import type { StudentAttendanceStatusFilter, StudentAttendanceSummaryModel } from "./types";
import { EMPTY_ATTENDANCE_SUMMARY } from "./types";

export type MarkKind = "present" | "absent" | "leave";

export type MarkRosterStudent = {
  id: string;
  name: string;
  roll: string;
};

type SlotMarksSource = {
  leaveIds: string[];
  absentIds: string[];
};

/** Rebuild UI marks from an existing slot register (or empty). */
export function marksFromRegister(
  existing: SlotMarksSource | null | undefined,
  students: MarkRosterStudent[],
): Record<string, MarkKind> {
  const cleaned: Record<string, MarkKind> = {};
  if (!existing) return cleaned;
  for (const student of students) {
    if (existing.leaveIds.includes(student.id)) cleaned[student.id] = "leave";
    else if (existing.absentIds.includes(student.id)) cleaned[student.id] = "absent";
    else cleaned[student.id] = "present";
  }
  return cleaned;
}

export function summarizeMarks(
  students: MarkRosterStudent[],
  marks: Record<string, MarkKind>,
): StudentAttendanceSummaryModel {
  if (!students.length) return EMPTY_ATTENDANCE_SUMMARY;
  let present = 0;
  let absent = 0;
  let leave = 0;
  let unmarked = 0;
  for (const student of students) {
    const kind = marks[student.id];
    if (kind === "present") present += 1;
    else if (kind === "absent") absent += 1;
    else if (kind === "leave") leave += 1;
    else unmarked += 1;
  }
  return { total: students.length, present, absent, leave, unmarked };
}

export function filterRosterByStatusAndSearch(
  students: MarkRosterStudent[],
  marks: Record<string, MarkKind>,
  status: StudentAttendanceStatusFilter,
  search: string,
): MarkRosterStudent[] {
  const q = search.trim().toLowerCase();
  return students.filter((student) => {
    const kind = marks[student.id];
    if (status === "unmarked" && kind !== undefined) return false;
    if (status !== "all" && status !== "unmarked" && kind !== status) {
      return false;
    }
    if (!q) return true;
    return (
      student.name.toLowerCase().includes(q) ||
      student.roll.toLowerCase().includes(q) ||
      student.id.toLowerCase().includes(q)
    );
  });
}
