/** Category barrel for system notifications. */
export const NOTIFICATION_CATEGORY = "system" as const;
export type NotificationCategoryId = typeof NOTIFICATION_CATEGORY;
export { SYSTEM_TEMPLATES } from "./templates";
export {
  notifySystemOpsCritical,
  notifySecurityEvent,
  notifyAccountSecurityChange,
  notifyMaintenance,
  notifySystemWarning,
  type SystemNotifyResult,
} from "./notify";
