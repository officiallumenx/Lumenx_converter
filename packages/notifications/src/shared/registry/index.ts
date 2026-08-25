export type {
  NotificationTemplateStatus,
  RegistryTemplateAudience,
  RegisteredNotificationTemplate,
  RenderVariables,
  NotificationFeature,
  NotificationAudience,
  NotificationTemplate,
  NotificationTemplateRender,
} from "./types";

export { NOTIFICATION_TEMPLATE_IDS } from "./ids";
export { extractAllowedVariables, interpolateTemplate } from "./variables";
export {
  categoryToLegacyFeature,
  toLegacyAudience,
  DEFAULT_DEEP_LINK,
  isLegacyNotificationFeature,
} from "./legacy-map";
export {
  assertSinglePublishedVersion,
  listRegisteredTemplates,
  getRegisteredTemplate,
  getPublishedTemplate,
  toLegacyNotificationTemplate,
  getNotificationTemplateById,
  listNotificationTemplates,
  renderNotificationTemplate,
  getGenericNotificationTemplateId,
  getTemplateDeepLink,
  publishRegisteredTemplate,
  archiveRegisteredTemplate,
  draftRegisteredTemplate,
  resetRegisteredTemplatesForTests,
} from "./api";
