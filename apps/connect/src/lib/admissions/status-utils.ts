import type { ApplicationStatus, DocumentVerificationStatus } from "./types";

export const STATUS_ORDER: ApplicationStatus[] = [
  "draft",
  "submitted",
  "review",
  "verification",
  "parent_confirmation",
  "waitlisted",
  "approved",
  "withdrawn",
  "rejected",
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  review: "Review",
  verification: "Verification",
  parent_confirmation: "Parent Confirmation",
  waitlisted: "Waitlisted",
  withdrawn: "Withdrawn",
  // legacy aliases
  documents_pending: "Documents Pending",
  documents_uploaded: "Documents Uploaded",
  document_verification: "Document Verification",
  interview_scheduled: "Verification",
  interview_completed: "Verification",
  under_final_review: "Under Final Review",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
};

export function normalizeApplicationStatus(status: ApplicationStatus): ApplicationStatus {
  if (status === "under_review" || status === "under_final_review") return "review";
  if (
    status === "documents_pending" ||
    status === "documents_uploaded" ||
    status === "document_verification" ||
    status === "interview_scheduled" ||
    status === "interview_completed"
  ) {
    return "verification";
  }
  if (status === "waitlisted") return "waitlisted";
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
    case "withdrawn":
    case "draft":
      return "secondary";
    case "review":
    case "verification":
    case "parent_confirmation":
    case "waitlisted":
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
  return s === "approved" || s === "rejected" || s === "withdrawn";
}

const ALLOWED_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ["submitted", "withdrawn"],
  submitted: ["review", "rejected", "withdrawn"],
  review: ["verification", "rejected", "withdrawn"],
  verification: ["parent_confirmation", "review", "rejected", "withdrawn"],
  parent_confirmation: ["approved", "waitlisted", "withdrawn"],
  waitlisted: ["parent_confirmation", "withdrawn"],
  approved: [],
  rejected: ["review"],
  withdrawn: ["review"],
  // legacy aliases are normalized before checks
  documents_pending: [],
  documents_uploaded: [],
  document_verification: [],
  interview_scheduled: [],
  interview_completed: [],
  under_final_review: [],
  under_review: [],
};

export function canTransitionApplicationStatus(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  const source = normalizeApplicationStatus(from);
  const target = normalizeApplicationStatus(to);
  if (source === target) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[source] ?? [];
  return allowed.includes(target);
}

export function getStatusProgress(status: ApplicationStatus): number {
  const s = normalizeApplicationStatus(status);
  const idx = STATUS_ORDER.indexOf(s);
  if (idx < 0) return 0;
  if (s === "rejected" || s === "withdrawn") return 100;
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
