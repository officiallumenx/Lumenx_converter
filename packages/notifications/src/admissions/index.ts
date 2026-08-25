/** Category barrel for admissions notifications. */
export const NOTIFICATION_CATEGORY = "admissions" as const;
export type NotificationCategoryId = typeof NOTIFICATION_CATEGORY;
export { ADMISSIONS_TEMPLATES } from "./templates";
export {
  ADMISSIONS_NOTIFICATIONS_KEY,
  admissionsStageToLifecycle,
  notifyAdmissionsLifecycle,
  pushAdmissionsPortalNotification,
  type AdmissionsLifecycleEvent,
  type AdmissionsPortalNotification,
} from "./notify";
