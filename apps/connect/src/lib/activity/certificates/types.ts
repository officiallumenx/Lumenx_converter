import type { AchievementSourceModule } from "../achievements/types";
import type { CertificateLifecycleStatus } from "@lumenx/types";

export type CertificateStatus = CertificateLifecycleStatus;

export type CertificateCategory =
  | "sports"
  | "academic"
  | "cultural"
  | "participation"
  | "excellence"
  | "competition";

export type CertificateTemplateLayout = "classic" | "modern" | "formal";

/** Reusable certificate template — backend will map to PDF layouts. */
export interface CertificateTemplate {
  id: string;
  name: string;
  description: string;
  category: CertificateCategory;
  layout: CertificateTemplateLayout;
}

export interface AchievementReference {
  achievementId: string;
  achievementTitle: string;
  sourceModule: AchievementSourceModule;
}

/** Certificate generated from an achievement — feeds student profile & verification. */
export interface ActivityCertificate {
  id: string;
  certificateNumber: string;
  verificationId: string;
  templateId: string;
  templateName: string;
  category: CertificateCategory;
  achievementRef: AchievementReference;
  studentId: string;
  studentName: string;
  studentClassLabel: string;
  teamId?: string;
  teamName?: string;
  issueDate: string;
  status: CertificateStatus;
  /** Mock QR payload for future public verification portal. */
  qrVerificationUrl: string;
  reissuedFromId?: string;
  reissueCount: number;
  revokedAt?: string;
  revokeReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityCertificateInput {
  achievementId: string;
  templateId: string;
  issueDate: string;
}

export type CertificateSortField = "date" | "student" | "updatedAt";

export interface CertificateListFilters {
  query?: string;
  templateId?: string | "all";
  category?: CertificateCategory | "all";
  studentId?: string | "all";
  teamId?: string | "all";
  status?: CertificateStatus | "all";
  date?: string | "all";
  sortBy?: CertificateSortField;
  sortDir?: "asc" | "desc";
}

export const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  revoked: "Revoked",
};

export const CERTIFICATE_CATEGORY_LABELS: Record<CertificateCategory, string> = {
  sports: "Sports",
  academic: "Academic",
  cultural: "Cultural",
  participation: "Participation",
  excellence: "Excellence",
  competition: "Competition",
};

export const CERTIFICATE_TEMPLATE_LAYOUT_LABELS: Record<CertificateTemplateLayout, string> = {
  classic: "Classic",
  modern: "Modern",
  formal: "Formal",
};
