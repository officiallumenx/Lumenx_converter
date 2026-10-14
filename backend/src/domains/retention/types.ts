export type RetentionReviewStatus =
  | "pending_graduation_date"
  | "active_retention"
  | "review_eligible"
  | "extended"
  | "legal_hold"
  | "deletion_approved"
  | "closed";

export type RetentionDecision =
  | "retain"
  | "extend"
  | "legal_hold"
  | "approve_deletion"
  | "set_graduation_date"
  | "clear_legal_hold";

export type StudentRetentionReviewRow = {
  id: string;
  institute_id: string;
  student_id: string;
  graduating_enrollment_id: string | null;
  graduated_on: string | null;
  review_eligible_on: string | null;
  status: RetentionReviewStatus;
  legal_hold: boolean;
  extended_until: string | null;
  last_reviewed_at: string | null;
  last_reviewed_by_user_id: string | null;
  last_decision: string | null;
  last_decision_reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StudentRetentionReviewDto = {
  id: string;
  instituteId: string;
  studentId: string;
  graduatingEnrollmentId: string | null;
  graduatedOn: string | null;
  reviewEligibleOn: string | null;
  status: RetentionReviewStatus;
  legalHold: boolean;
  extendedUntil: string | null;
  lastReviewedAt: string | null;
  lastReviewedByUserId: string | null;
  lastDecision: string | null;
  lastDecisionReason: string | null;
  studentDisplayName?: string;
  createdAt: string;
  updatedAt: string;
};

export type EnsureRetentionReviewInput = {
  instituteId: string;
  studentId: string;
  graduatingEnrollmentId?: string | null;
  graduatedOn: string | null;
};

export type RetentionDecisionInput = {
  decision: RetentionDecision;
  reason: string;
  /** Required for extend — YYYY-MM-DD after current eligibility. */
  extendedUntil?: string | null;
  /** Required for set_graduation_date. */
  graduatedOn?: string | null;
};

export type ListRetentionReviewsFilter = {
  instituteId: string;
  status?: RetentionReviewStatus;
  reviewEligibleOnOrBefore?: string;
};
