/** Category barrel for timetable notifications. */
export const NOTIFICATION_CATEGORY = "timetable" as const;
export type NotificationCategoryId = typeof NOTIFICATION_CATEGORY;
export { TIMETABLE_TEMPLATES } from "./templates";
export {
  notifyTimetablePublished,
  notifyTimetableChanged,
  type TimetableNotifyResult,
} from "./notify";
