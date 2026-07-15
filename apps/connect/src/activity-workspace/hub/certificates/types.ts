/**
 * Activity Hub — certificate references shared across modules.
 */
import type { ActivityCategoryId } from "../categories";

export type ActivityCertificateStatus = "draft" | "issued" | "revoked";

export interface ActivityCertificateRef {
  id: string;
  title: string;
  activityId: string;
  category: ActivityCategoryId;
  recipientCount: number;
  issuedOn?: string;
  status: ActivityCertificateStatus;
}
