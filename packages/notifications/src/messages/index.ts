/** Category barrel for messages notifications. */
export const NOTIFICATION_CATEGORY = "messages" as const;
export type NotificationCategoryId = typeof NOTIFICATION_CATEGORY;
export { MESSAGES_TEMPLATES } from "./templates";
export {
  notifyDirectMessage,
  type DirectMessageRecipientRole,
  type NotifyDirectMessageInput,
  type NotifyDirectMessageResult,
} from "./notify";
