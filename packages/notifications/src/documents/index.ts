/** Category barrel for documents notifications. */
export const NOTIFICATION_CATEGORY = "documents" as const;
export type NotificationCategoryId = typeof NOTIFICATION_CATEGORY;
export { DOCUMENTS_TEMPLATES } from "./templates";
export {
  notifyDocumentRequestReceived,
  notifyDocumentRequestApproved,
  notifyDocumentRequestRejected,
  notifyDocumentGenerated,
  notifyDocumentReady,
  type DocumentsNotifyResult,
} from "./notify";
