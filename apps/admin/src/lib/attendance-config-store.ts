/**
 * Admin re-export of shared Attendance Configuration + history helpers.
 * Source of truth: @lumenx/module-attendance
 */

export {
  ATTENDANCE_METHOD_OPTIONS,
  ATTENDANCE_OWNER_OPTIONS,
  ATTENDANCE_SCOPE_OPTIONS,
  loadAttendanceConfigVersions,
  attendanceMethodLabel,
  attendanceOwnerLabel,
  attendanceScopeLabel,
  validateNewAttendanceConfig,
  appendAttendanceConfig,
  resolveAttendanceConfigForDate,
  getActiveAttendanceConfig,
  configVersionsTouchingRange,
  buildConfigHistoryTimeline,
  isConfigVersionActiveOnDate,
  buildAttendanceHistoryReport,
  type AttendanceMethod,
  type AttendanceOwner,
  type AttendanceConfigScope,
  type AttendanceConfigVersion,
  type AttendanceConfigSnapshot,
  type NewAttendanceConfigInput,
  type AttendanceConfigValidationError,
  type AttendanceHistoryReport,
  type AttendanceConfigHistoryEntry,
} from "@lumenx/module-attendance";
