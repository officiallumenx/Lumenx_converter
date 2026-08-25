/**
 * Shared portal primitives used by Admissions, Careers, and Admin mirrors.
 * Keep runtime-identical unions here; do not merge near-duplicates that differ.
 */

/** Contact / inquiry thread status. */
export type ContactInquiryStatus = "open" | "answered" | "closed";

/** Interview delivery mode. */
export type InterviewMode = "in_person" | "phone" | "video";

/**
 * Admin document verification statuses shared by Admissions + Careers detail panels.
 * (Connect DocumentVerificationStatus variants differ — do not alias them here.)
 */
export type AdminPortalDocStatus =
  | "verified"
  | "under_review"
  | "uploaded"
  | "resubmission_required"
  | "rejected"
  | "not_uploaded";

/** Activity / hub certificate lifecycle. */
export type CertificateLifecycleStatus = "draft" | "issued" | "revoked";
