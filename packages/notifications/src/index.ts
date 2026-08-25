/**
 * @lumenx/notifications — shared notification foundation + template registry.
 *
 * Phase 1: shared contract + adapters.
 * Phase 2: central template registry (category modules) consumed by Nexus catalog
 * and re-exported via `@lumenx/module-notifications` for existing callers.
 */

export * from "./shared";

export { NOTIFICATION_CATEGORY as ATTENDANCE_NOTIFICATION_CATEGORY } from "./attendance";
export { NOTIFICATION_CATEGORY as HOMEWORK_NOTIFICATION_CATEGORY } from "./homework";
export {
  HOMEWORK_TEMPLATES,
  cancelHomeworkReminders,
  notifyHomeworkAssigned,
  notifyHomeworkDuePassed,
  notifyHomeworkNotSubmitted,
  notifyHomeworkReminder,
  notifyHomeworkSubmitted,
} from "./homework";
export { NOTIFICATION_CATEGORY as FEES_NOTIFICATION_CATEGORY } from "./fees";
export {
  FEES_TEMPLATES,
  notifyFeeAdded,
  notifyFeeDue,
  notifyFeeDueReminder,
  notifyFeeOverdue,
  notifyFeePaymentReceived,
  notifyFeeReceiptAvailable,
  listFeesParentInbox,
  pushFeesParentInbox,
} from "./fees";
export { NOTIFICATION_CATEGORY as EXAMS_NOTIFICATION_CATEGORY } from "./exams";
export {
  EXAMS_TEMPLATES,
  notifyExamTimetablePublished,
  notifyExamReminder,
  notifyExamScheduleChange,
  notifyExamResultsPublished,
  notifyTeacherMarksPending,
  notifyTeacherMarksDeadline,
  notifyTeacherMarksPublishPending,
  notifyAdminMarksPending,
  notifyAdminResultsReady,
  scheduleExamPaperReminders,
} from "./exams";
export { NOTIFICATION_CATEGORY as EVENTS_NOTIFICATION_CATEGORY } from "./events";
export {
  EVENTS_TEMPLATES,
  notifyEventPublished,
  notifyEventChanged,
  notifyEventCancelled,
  scheduleEventReminders,
} from "./events";
export { NOTIFICATION_CATEGORY as TRANSPORT_NOTIFICATION_CATEGORY } from "./transport";
export {
  TRANSPORT_TEMPLATES,
  transportWorkflowToLumenX,
  type TransportWorkflowNotificationLike,
} from "./transport";
export { NOTIFICATION_CATEGORY as LEAVE_NOTIFICATION_CATEGORY } from "./leave";
export {
  LEAVE_TEMPLATES,
  notifyAdminOfTeacherLeave,
  notifyParentLeaveDecision,
  notifyParentLeavePending,
  notifyTeacherLeaveDecision,
  notifyTeacherLeavePending,
  notifyTeacherOfStudentLeave,
} from "./leave";
export { NOTIFICATION_CATEGORY as ANNOUNCEMENTS_NOTIFICATION_CATEGORY } from "./announcements";
export {
  ANNOUNCEMENTS_TEMPLATES,
  publishBroadcastNotification,
  type BroadcastAudienceKind,
  type PublishBroadcastInput,
} from "./announcements";
export { NOTIFICATION_CATEGORY as MESSAGES_NOTIFICATION_CATEGORY } from "./messages";
export {
  MESSAGES_TEMPLATES,
  notifyDirectMessage,
  type DirectMessageRecipientRole,
  type NotifyDirectMessageInput,
} from "./messages";
export { NOTIFICATION_CATEGORY as COMPLAINTS_NOTIFICATION_CATEGORY } from "./complaints";
export {
  COMPLAINTS_TEMPLATES,
  notifyComplaintLifecycle,
  notifyComplaintSubmitted,
} from "./complaints";
export { NOTIFICATION_CATEGORY as ADMISSIONS_NOTIFICATION_CATEGORY } from "./admissions";
export {
  ADMISSIONS_TEMPLATES,
  admissionsStageToLifecycle,
  notifyAdmissionsLifecycle,
  type AdmissionsLifecycleEvent,
} from "./admissions";
export { NOTIFICATION_CATEGORY as CAREERS_NOTIFICATION_CATEGORY } from "./careers";
export {
  CAREERS_TEMPLATES,
  careersStatusToLifecycle,
  notifyCareersLifecycle,
  type CareersLifecycleEvent,
} from "./careers";
export { NOTIFICATION_CATEGORY as CERTIFICATES_NOTIFICATION_CATEGORY } from "./certificates";
export {
  CERTIFICATES_TEMPLATES,
  notifyCertificateIssued,
  notifyCertificatePublished,
} from "./certificates";
export { NOTIFICATION_CATEGORY as DOCUMENTS_NOTIFICATION_CATEGORY } from "./documents";
export {
  DOCUMENTS_TEMPLATES,
  notifyDocumentRequestReceived,
  notifyDocumentRequestApproved,
  notifyDocumentRequestRejected,
  notifyDocumentGenerated,
  notifyDocumentReady,
} from "./documents";
export { NOTIFICATION_CATEGORY as TIMETABLE_NOTIFICATION_CATEGORY } from "./timetable";
export {
  TIMETABLE_TEMPLATES,
  notifyTimetablePublished,
  notifyTimetableChanged,
} from "./timetable";
export {
  PHASE7_INBOX_KEY,
  listPhase7Inbox,
  pushPhase7Inbox,
  cancelPhase7Reminders,
} from "./shared/phase7-inbox";
export {
  PHASE8_INBOX_KEY,
  listPhase8Inbox,
  pushPhase8Inbox,
} from "./shared/phase8-inbox";
export {
  DEFAULT_NOTIFICATION_HREF,
  ensureNotificationHref,
  dedupeNotificationsById,
  isImportantNotification,
} from "./shared/consumption";
export { NOTIFICATION_CATEGORY as SYSTEM_NOTIFICATION_CATEGORY } from "./system";
export {
  SYSTEM_TEMPLATES,
  notifySystemOpsCritical,
  notifySecurityEvent,
  notifyAccountSecurityChange,
  notifyMaintenance,
  notifySystemWarning,
} from "./system";
export { NOTIFICATION_CATEGORY as NEXUS_NOTIFICATION_CATEGORY } from "./nexus";
