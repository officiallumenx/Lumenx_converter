/**
 * Activity Hub — certificate references shared across modules.
 */
import type { ActivityCategoryId } from "../categories";
import type { CertificateLifecycleStatus } from "@lumenx/types";

export type ActivityCertificateStatus = CertificateLifecycleStatus;

export interface ActivityCertificateRef {
  id: string;
  title: string;
  activityId: string;
  category: ActivityCategoryId;
  recipientCount: number;
  issuedOn?: string;
  status: ActivityCertificateStatus;
}
