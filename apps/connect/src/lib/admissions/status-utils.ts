import type { ApplicationStatus, DocumentVerificationStatus } from "./types";

export const STATUS_ORDER: ApplicationStatus[] = [
  "draft",
  "submitted",
  "documents_pending",
  "documents_uploaded",
  "document_verification",
  "interview_scheduled",
  "interview_completed",
  "under_final_review",
  "approved",
  "waitlisted",
  "rejected",
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  documents_pending: "Documents Pending",
  documents_uploaded: "Documents Uploaded",
  document_verification: "Document Verification",
  interview_scheduled: "Interview Scheduled",
  interview_completed: "Interview Completed",
  under_final_review: "Under Final Review",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  waitlisted: "Waitlisted",
};

export function normalizeApplicationStatus(status: ApplicationStatus): ApplicationStatus {
  if (status === "under_review") return "under_final_review";
  return status;
}

export function statusLabel(status: ApplicationStatus): string {
  return STATUS_LABELS[normalizeApplicationStatus(status)] ?? status;
}

export function statusTone(
  status: ApplicationStatus,
): "default" | "secondary" | "destructive" | "outline" {
  const s = normalizeApplicationStatus(status);
  switch (s) {
    case "approved":
      return "default";
    case "rejected":
      return "destructive";
    case "waitlisted":
    case "draft":
      return "secondary";
    case "interview_scheduled":
    case "interview_completed":
    case "document_verification":
    case "documents_pending":
    case "documents_uploaded":
      return "outline";
    default:
      return "default";
  }
}

export function normalizeDocumentStatus(
  status: DocumentVerificationStatus,
): DocumentVerificationStatus {
  if (status === "pending_verification") return "under_review";
  if (status === "requires_resubmission") return "resubmission_required";
  return status;
}

export function documentStatusLabel(status: DocumentVerificationStatus | string): string {
  const s = normalizeDocumentStatus(status as DocumentVerificationStatus);
  const map: Record<DocumentVerificationStatus, string> = {
    not_uploaded: "Not Uploaded",
    uploaded: "Uploaded",
    under_review: "Under Review",
    verified: "Verified",
    rejected: "Rejected",
    resubmission_required: "Resubmission Required",
    pending_verification: "Under Review",
    requires_resubmission: "Resubmission Required",
  };
  return map[s] ?? String(status).replace(/_/g, " ");
}

export function isTerminalStatus(status: ApplicationStatus): boolean {
  const s = normalizeApplicationStatus(status);
  return s === "approved" || s === "rejected";
}

export function getStatusProgress(status: ApplicationStatus): number {
  const s = normalizeApplicationStatus(status);
  const idx = STATUS_ORDER.indexOf(s);
  if (idx < 0) return 0;
  if (s === "rejected") return 100;
  return Math.round(((idx + 1) / STATUS_ORDER.length) * 100);
}

export function documentStatusTone(
  status: DocumentVerificationStatus,
): "default" | "secondary" | "destructive" | "outline" {
  const s = normalizeDocumentStatus(status);
  switch (s) {
    case "verified":
      return "default";
    case "rejected":
      return "destructive";
    case "resubmission_required":
      return "outline";
    case "under_review":
    case "uploaded":
      return "secondary";
    default:
      return "outline";
  }
}
