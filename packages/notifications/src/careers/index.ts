/** Category barrel for careers notifications. */
export const NOTIFICATION_CATEGORY = "careers" as const;
export type NotificationCategoryId = typeof NOTIFICATION_CATEGORY;
export { CAREERS_TEMPLATES } from "./templates";
export {
  CAREERS_NOTIFICATIONS_KEY,
  careersStatusToLifecycle,
  notifyCareersLifecycle,
  pushCareersPortalNotification,
  type CareersLifecycleEvent,
  type CareersPortalNotification,
} from "./notify";
