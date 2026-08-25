/** Category barrel for leave notifications. */
export const NOTIFICATION_CATEGORY = "leave" as const;
export type NotificationCategoryId = typeof NOTIFICATION_CATEGORY;
export { LEAVE_TEMPLATES } from "./templates";
export {
  notifyAdminOfTeacherLeave,
  notifyParentLeaveDecision,
  notifyParentLeavePending,
  notifyTeacherLeaveDecision,
  notifyTeacherLeavePending,
  notifyTeacherOfStudentLeave,
} from "./notify";
