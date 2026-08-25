/**
 * Student Attendance — Admin workspace (filters + shared Attendance Engine mark sheet).
 */

export type {
  StudentAttendanceStatusFilter,
  StudentAttendanceClassOption,
  StudentAttendanceSectionOption,
  StudentAttendanceWorkspaceState,
  StudentAttendanceSummaryModel,
} from "./types";
export {
  EMPTY_ATTENDANCE_SUMMARY,
  STUDENT_ATTENDANCE_STATUS_OPTIONS,
  todayIsoDate,
  defaultStudentAttendanceWorkspaceState,
} from "./types";

export {
  marksFromRegister,
  summarizeMarks,
  filterRosterByStatusAndSearch,
} from "./mark-helpers";

export {
  listStudentAttendanceClassOptions,
  listStudentAttendanceSectionOptions,
} from "./class-section-options";

export { StudentAttendanceClassSelect } from "./StudentAttendanceClassSelect";
export { StudentAttendanceSectionSelect } from "./StudentAttendanceSectionSelect";
export { StudentAttendanceDateField } from "./StudentAttendanceDateField";
export { StudentAttendanceStatusFilterControl } from "./StudentAttendanceStatusFilter";
export { StudentAttendanceSearchField } from "./StudentAttendanceSearchField";
export { StudentAttendanceFilters } from "./StudentAttendanceFilters";
export { StudentAttendanceSummary } from "./StudentAttendanceSummary";
export { StudentAttendanceRosterPlaceholder } from "./StudentAttendanceRosterPlaceholder";
export { StudentAttendanceMarkPanel } from "./StudentAttendanceMarkPanel";
export { StudentAttendanceWorkspace } from "./StudentAttendanceWorkspace";
