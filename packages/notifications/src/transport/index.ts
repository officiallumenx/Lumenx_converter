/** Category barrel for transport notifications. */
export const NOTIFICATION_CATEGORY = "transport" as const;
export type NotificationCategoryId = typeof NOTIFICATION_CATEGORY;
export { TRANSPORT_TEMPLATES } from "./templates";
export {
  transportWorkflowToLumenX,
  type TransportWorkflowNotificationLike,
} from "./adapters";
