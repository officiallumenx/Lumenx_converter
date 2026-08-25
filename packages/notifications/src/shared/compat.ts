/**
 * Compatibility: existing notification building blocks + central template registry.
 */

export type {
  AppNotification,
  NotificationCategory,
  SchoolAlert,
  AlertSeverity,
  AlertCategory,
} from "@lumenx/types";

export {
  NOTIFICATION_TEMPLATE_IDS,
  getNotificationTemplateById,
  listNotificationTemplates,
  renderNotificationTemplate,
  getGenericNotificationTemplateId,
  listRegisteredTemplates,
  getRegisteredTemplate,
  getPublishedTemplate,
  getTemplateDeepLink,
  publishRegisteredTemplate,
  archiveRegisteredTemplate,
  draftRegisteredTemplate,
  resetRegisteredTemplatesForTests,
  assertSinglePublishedVersion,
  type NotificationFeature,
  type NotificationAudience,
  type NotificationTemplate,
  type NotificationTemplateRender,
  type RegisteredNotificationTemplate,
  type NotificationTemplateStatus,
  type RegistryTemplateAudience,
} from "./registry";

export {
  NOTIFICATION_RETENTION_DAYS,
  NOTIFICATION_RECYCLE_BIN_DAYS,
  NOTIFICATION_STATE_KEY,
  isNotificationStarred,
  setNotificationStarred,
  applyStarredFlags,
  applyNotificationRetention,
  softDeleteNotification,
  loadNotificationRecycleBin,
  restoreNotificationFromBin,
  purgeNotificationRecycleBin,
  notificationRetentionSummary,
  type RecycledNotification,
  type RetentionAwareNotification,
  type NotificationLifecycleState,
} from "@lumenx/utils";
