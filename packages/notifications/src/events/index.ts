/** Category barrel for events notifications. */
export const NOTIFICATION_CATEGORY = "events" as const;
export type NotificationCategoryId = typeof NOTIFICATION_CATEGORY;
export { EVENTS_TEMPLATES } from "./templates";
export {
  notifyEventPublished,
  notifyEventChanged,
  notifyEventCancelled,
  scheduleEventReminders,
  type EventNotifyResult,
  type EventNotifyAudience,
} from "./notify";
