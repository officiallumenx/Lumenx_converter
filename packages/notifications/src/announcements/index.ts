/** Category barrel for announcements notifications. */
export const NOTIFICATION_CATEGORY = "announcements" as const;
export type NotificationCategoryId = typeof NOTIFICATION_CATEGORY;
export { ANNOUNCEMENTS_TEMPLATES } from "./templates";
export {
  publishBroadcastNotification,
  type BroadcastAudienceKind,
  type PublishBroadcastInput,
  type PublishBroadcastResult,
} from "./notify";
