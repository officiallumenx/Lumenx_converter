/**
 * Connect attendance identity — re-exports the module canonical helpers.
 * Do not invent alternate section/class/student key formats here.
 */

export {
  canonicalAttendanceClassId,
  canonicalAttendanceSectionKey as attendanceSectionKey,
  canonicalAttendanceSectionKey,
  normalizeAttendanceSectionKey,
  normalizeAttendanceSectionKeys,
  canonicalAttendanceStudentId,
  toAttendanceStudentId,
  parseAttendanceStudentId,
  isCanonicalAttendanceStudentId,
} from "@lumenx/module-attendance";
