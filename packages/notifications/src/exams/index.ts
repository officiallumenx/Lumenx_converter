/** Category barrel for exams notifications. */
export const NOTIFICATION_CATEGORY = "exams" as const;
export type NotificationCategoryId = typeof NOTIFICATION_CATEGORY;
export { EXAMS_TEMPLATES } from "./templates";
export {
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
  type ExamNotifyResult,
  type ExamScheduleChangeKind,
} from "./notify";
