/**
 * Learner day status from Attendance Registers only (no calendar seed / demo seed).
 */

import { listRegistersForSection } from "./register-store";
import { normalizeAttendanceSectionKey } from "./identity";

export type RegisterDayStatus = "present" | "absent" | "leave" | "unknown";

/**
 * Resolve one student's status for a section/date from submitted registers.
 * Period-wise: leave if any slot leave; else absent if any slot absent; else present.
 */
export function resolveStudentStatusFromRegisters(input: {
  studentId: string;
  sectionKey: string;
  date: string;
}): RegisterDayStatus {
  const sectionKey = normalizeAttendanceSectionKey(input.sectionKey);
  const regs = listRegistersForSection(sectionKey).filter(
    (r) => r.date === input.date.slice(0, 10) && r.status === "submitted",
  );
  if (regs.length === 0) return "unknown";
  if (regs.some((r) => r.leaveIds.includes(input.studentId))) return "leave";
  if (regs.some((r) => r.absentIds.includes(input.studentId))) return "absent";
  return "present";
}

/** True when the section has at least one submitted register on the date. */
export function sectionHasSubmittedAttendance(
  sectionKey: string,
  date: string,
): boolean {
  const key = normalizeAttendanceSectionKey(sectionKey);
  return listRegistersForSection(key).some(
    (r) => r.date === date.slice(0, 10) && r.status === "submitted",
  );
}
