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

function matchesRosterSearch(query: string, student: MarkRosterStudent): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = student.name.toLowerCase();
  const roll = student.roll.toLowerCase();
  const id = student.id.toLowerCase();
  if (name.includes(q) || roll.includes(q) || id.includes(q)) return true;

  const qDigits = q.replace(/\D/g, "").replace(/^0+/, "") || q.replace(/\D/g, "");
  if (!qDigits) return false;
  const rollDigits =
    student.roll.replace(/\D/g, "").replace(/^0+/, "") || student.roll.replace(/\D/g, "");
  return Boolean(rollDigits && (rollDigits === qDigits || rollDigits.includes(qDigits)));
}

export function filterRosterByStatusAndSearch(
  students: MarkRosterStudent[],
  marks: Record<string, MarkKind>,
  status: StudentAttendanceStatusFilter,
  search: string,
): MarkRosterStudent[] {
  return students.filter((student) => {
    const kind = marks[student.id];
    if (status === "unmarked" && kind !== undefined) return false;
    if (status !== "all" && status !== "unmarked" && kind !== status) {
      return false;
    }
    return matchesRosterSearch(search, student);
  });
}
