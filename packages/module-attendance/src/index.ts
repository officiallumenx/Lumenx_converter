import { MODULE_IDS } from "@lumenx/config/module-ids";

export const MODULE_ID = MODULE_IDS.attendance;
export const MIN_PLAN = "core" as const;
export const OWNER_APP = "admin" as const;
export const MODULE_NAME = "Attendance";

export type {
  AttendanceMethod,
  AttendanceOwner,
  AttendanceConfigScope,
  AttendanceConfigVersion,
  AttendanceConfigSnapshot,
  AttendanceSlotKind,
  AttendanceSlot,
  AttendanceMarkStatus,
  AttendanceSlotRegister,
  AttendanceActor,
  PeriodInput,
  OpenAttendanceWorkflowInput,
  AttendanceWorkflow,
} from "./types";

export {
  ATTENDANCE_CONFIG_STORAGE_KEY,
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
  replaceAttendanceConfigSnapshotForTests,
  type NewAttendanceConfigInput,
  type AttendanceConfigValidationError,
} from "./config-store";

export { buildAttendanceSlots, periodsFromTimetableSlots } from "./slots";
export {
  resolveMarkableSlots,
  actorCanMarkSlot,
  type OwnershipDecision,
} from "./ownership";
export {
  createAttendanceWorkflow,
  type AttendanceEngineConfig,
  type CreateAttendanceWorkflowInput,
} from "./attendance-engine";
export {
  ATTENDANCE_REGISTER_STORAGE_KEY,
  registerKey,
  loadSlotRegister,
  listRegistersForSection,
  listAllSlotRegisters,
  upsertSlotRegister,
  clearAttendanceRegistersForTests,
} from "./register-store";
export {
  openAttendanceWorkflow,
  openAttendanceWorkflowFromConfig,
  saveSlotAttendance,
  getSlotAttendance,
  getSectionAttendanceHistory,
  listPendingSlots,
  applyLeaveApprovalToRegisters,
  applyLateEntryToRegisters,
  applyEarlyExitToRegisters,
  type SaveSlotAttendanceInput,
  type SaveSlotAttendanceResult,
  type AttendanceWriteKind,
  type ApplyStudentAttendanceAdjustmentInput,
  type ApplyStudentAttendanceAdjustmentResult,
} from "./engine";
export {
  enumerateIsoDates,
  isSunday,
  isWorkingDay,
  resolveHistoricalDay,
  configVersionsTouchingRange,
  buildConfigHistoryTimeline,
  isConfigVersionActiveOnDate,
  assertRegistersUntouchedBy,
  expectedSlotIdsForDay,
  type HistoricalDayContext,
  type AttendanceConfigHistoryEntry,
} from "./history";
export {
  buildAttendanceHistoryReport,
  computeAttendancePct,
  buildTeacherReportCards,
  type AttendanceReportRange,
  type StudentAttendanceReportRow,
  type AttendanceHistoryReport,
  type AttendanceReportCard,
} from "./reports";
export {
  ATTENDANCE_REPORT_KIND_OPTIONS,
  buildAttendanceReportByKind,
  buildDailyAttendanceRows,
  buildWeeklyAttendanceRows,
  buildMonthlyAttendanceRows,
  buildStudentAttendanceRows,
  buildTeacherAttendanceRows,
  buildClassAttendanceRows,
  buildSectionAttendanceRows,
  attendanceWeekBounds,
  type AttendanceReportKind,
  type AttendanceReportSectionInput,
  type AttendanceReportCommonInput,
  type AttendanceReportBundle,
  type DailyAttendanceRow,
  type WeeklyAttendanceRow,
  type MonthlyAttendanceRow,
  type StudentAttendanceRow,
  type TeacherAttendanceRow,
  type ClassAttendanceRow,
  type SectionAttendanceRow,
} from "./admin-reports";
export {
  buildAttendanceTrends,
  buildLowAttendanceSections,
  buildFrequentlyAbsentStudents,
  type AttendanceTrendPoint,
  type LowAttendanceSection,
  type FrequentlyAbsentStudent,
} from "./analytics";
export { ensureDemoAttendanceHistorySeed } from "./seed-history";
export {
  ATTENDANCE_PERSONA_OPTIONS,
  ADMIN_ROLE_TO_ATTENDANCE_PERSONA,
  resolveAttendancePermission,
  resolveAttendancePersonaFromAdminRoleId,
  attendanceRouteCapsForPersona,
  attendanceAdminRoutePermissionsForRole,
  listAttendancePermissionMatrix,
  isAttendanceSectionAllowed,
  filterAttendanceSectionKeys,
  attendanceActorFlagsForSection,
  attendancePermissionBanner,
  type AttendancePersona,
  type AttendanceScopeMode,
  type AttendancePermissionDecision,
  type AttendanceRoutePermission,
  type AttendancePersonaRouteCaps,
  type AttendanceActorFacts,
} from "./permissions";
export {
  canonicalAttendanceClassId,
  canonicalAttendanceSectionKey,
  normalizeAttendanceSectionKey,
  normalizeAttendanceSectionKeys,
  canonicalAttendanceRoll,
  canonicalAttendanceStudentId,
  parseAttendanceStudentId,
  isCanonicalAttendanceStudentId,
  toAttendanceStudentId,
} from "./identity";
export {
  isLateAttendanceSubmission,
  buildAdminAttendanceDashboard,
  aggregateSectionAttendanceReports,
  labelForAttendanceStatus,
  resolveLearnerTodayAttendance,
  buildLearnerAttendanceNotifications,
  countWorkingDaysInMonth,
  type AdminAttendanceDashboard,
  type CoordinatorAttendanceSummary,
  type LearnerTodayAttendance,
} from "./dashboard";
export {
  resolveStudentStatusFromRegisters,
  sectionHasSubmittedAttendance,
  type RegisterDayStatus,
} from "./learner-history";
export {
  listPendingAttendanceFromRegisters,
  type AttendancePendingExpectation,
  type AttendancePendingRow,
} from "./pending-from-registers";
export {
  WORKFLOW_VERIFICATION_CASES,
  runAttendanceWorkflowVerification,
  formatAttendanceWorkflowVerificationReport,
  type WorkflowVerificationCase,
  type WorkflowVerificationResult,
} from "./verify";
export {
  runAttendanceHistoryVerification,
  formatAttendanceHistoryVerificationReport,
} from "./history-verify";

export type {
  AttendanceNotificationTiming,
  AttendanceNotificationTrigger,
  AttendanceNotificationRecipient,
  AttendanceNotificationConfig,
  AttendanceNotificationEvent,
  AttendanceNotificationMessage,
  AttendanceNotificationInboxItem,
} from "./notification-types";
export {
  ATTENDANCE_NOTIFICATION_TIMING_OPTIONS,
  ATTENDANCE_NOTIFICATION_TRIGGER_OPTIONS,
  ATTENDANCE_NOTIFICATION_RECIPIENT_OPTIONS,
} from "./notification-types";
export {
  ATTENDANCE_NOTIFICATION_CONFIG_KEY,
  loadAttendanceNotificationConfig,
  saveAttendanceNotificationConfig,
  attendanceNotificationTimingLabel,
  attendanceNotificationTriggerLabel,
} from "./notification-config-store";
export {
  ATTENDANCE_NOTIFICATION_OUTBOX_KEY,
  ATTENDANCE_NOTIFICATION_SUMMARY_QUEUE_KEY,
  ATTENDANCE_NOTIFICATION_INBOX_KEY,
  ATTENDANCE_DAILY_SUMMARY_AUTO_FLUSH_HOUR,
  ATTENDANCE_INBOX_CHANGED_EVENT,
  emitAttendanceNotifications,
  notifyFromAttendanceSubmit,
  notifyAttendancePercentageWarning,
  flushDailyAttendanceSummary,
  ensureDailyAttendanceSummariesFlushed,
  listAttendanceNotificationOutbox,
  listAttendanceNotificationQueue,
  listAttendanceNotificationInbox,
  clearAttendanceNotificationOutboxForTests,
  buildAttendanceNotificationEventId,
  buildAttendanceNotificationMessageId,
  buildAttendanceDailySummaryMessageId,
  buildAttendancePercentageMessageId,
  ATTENDANCE_NOTIFICATION_DEEP_LINK,
  type EmitAttendanceNotificationInput,
} from "./notification-flow";
