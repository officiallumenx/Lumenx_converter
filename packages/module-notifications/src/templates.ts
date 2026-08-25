/**
 * Compatibility shim — templates now live in `@lumenx/notifications` registry.
 * Existing imports from `@lumenx/module-notifications` continue to work unchanged.
 */

export {
  NOTIFICATION_TEMPLATE_IDS,
  getNotificationTemplateById,
  listNotificationTemplates,
  renderNotificationTemplate,
  getGenericNotificationTemplateId,
  type NotificationFeature,
  type NotificationAudience,
  type NotificationTemplate,
  type NotificationTemplateRender,
} from "@lumenx/notifications";
