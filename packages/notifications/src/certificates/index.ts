/** Category barrel for certificates notifications. */
export const NOTIFICATION_CATEGORY = "certificates" as const;
export type NotificationCategoryId = typeof NOTIFICATION_CATEGORY;
export { CERTIFICATES_TEMPLATES } from "./templates";
export {
  notifyCertificateIssued,
  notifyCertificatePublished,
  type CertificatesNotifyResult,
} from "./notify";
