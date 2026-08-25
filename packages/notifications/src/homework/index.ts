/** Category barrel for homework notifications. */
export const NOTIFICATION_CATEGORY = "homework" as const;
export type NotificationCategoryId = typeof NOTIFICATION_CATEGORY;
export { HOMEWORK_TEMPLATES } from "./templates";
export {
  HOMEWORK_REMINDER_CANCELLED_KEY,
  cancelHomeworkReminders,
  isHomeworkReminderCancelled,
  notifyHomeworkAssigned,
  notifyHomeworkDuePassed,
  notifyHomeworkNotSubmitted,
  notifyHomeworkReminder,
  notifyHomeworkSubmitted,
} from "./notify";
