/**
 * @deprecated Dual-write pending store removed.
 * Admin/Connect pending must use Registers via
 * `listPendingAttendanceFromRegisters` / `loadAttendancePendingFromRegisters`.
 * These stubs remain only for API compatibility.
 */

export const ATTENDANCE_PENDING_KEY = "lumenx.attendance-pending.v1";

export type AttendancePendingClass = {
  classId: string;
  classLabel: string;
  teacherId: string;
  teacherName: string;
  date: string;
  studentCount: number;
};

/** @deprecated No-op — pending is derived from Registers. */
export function ensureAttendancePendingSeed(_date?: string): AttendancePendingClass[] {
  return [];
}

/** @deprecated Prefer register-derived pending helpers. */
export function loadAttendancePending(_date?: string): AttendancePendingClass[] {
  return [];
}

/** @deprecated No-op — submitting attendance writes Registers only. */
export function markAttendanceSubmitted(_classId: string, _date?: string): void {}

/** @deprecated No-op — pending is not a writable store. */
export function setAttendancePendingForDate(
  _date: string,
  _rows: Omit<AttendancePendingClass, "date">[],
): void {}

export function summarizeAttendancePendingByTeacher(
  rows: AttendancePendingClass[],
): { teacherId: string; teacherName: string; pendingCount: number; classLabels: string[] }[] {
  const map = new Map<
    string,
    { teacherId: string; teacherName: string; pendingCount: number; classLabels: string[] }
  >();
  for (const r of rows) {
    let row = map.get(r.teacherId);
    if (!row) {
      row = {
        teacherId: r.teacherId,
        teacherName: r.teacherName,
        pendingCount: 0,
        classLabels: [],
      };
      map.set(r.teacherId, row);
    }
    row.pendingCount += 1;
    if (!row.classLabels.includes(r.classLabel)) row.classLabels.push(r.classLabel);
  }
  return [...map.values()].sort((a, b) => b.pendingCount - a.pendingCount);
}
