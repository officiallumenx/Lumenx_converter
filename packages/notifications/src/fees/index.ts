/** Category barrel for fees notifications. */
export const NOTIFICATION_CATEGORY = "fees" as const;
export type NotificationCategoryId = typeof NOTIFICATION_CATEGORY;
export { FEES_TEMPLATES } from "./templates";
export {
  notifyFeeAdded,
  notifyFeeDue,
  notifyFeeDueReminder,
  notifyFeeOverdue,
  notifyFeePaymentReceived,
  notifyFeeReceiptAvailable,
} from "./notify";
export { FEES_PARENT_INBOX_KEY, listFeesParentInbox, pushFeesParentInbox } from "./inbox";
