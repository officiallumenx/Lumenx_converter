/** Category barrel for complaints notifications. */
export const NOTIFICATION_CATEGORY = "complaints" as const;
export type NotificationCategoryId = typeof NOTIFICATION_CATEGORY;
export { COMPLAINTS_TEMPLATES } from "./templates";
export {
  notifyComplaintLifecycle,
  notifyComplaintSubmitted,
  type ComplaintLifecycleStage,
  type ComplaintNotifyResult,
} from "./notify";
