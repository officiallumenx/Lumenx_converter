/** Nexus billing foundation: renewals, adjustments, payments. */

export type RenewalStatus =
  | "draft"
  | "issued"
  | "pending"
  | "paid"
  | "overdue"
  | "cancelled";

export type AdjustmentKind =
  | "headcount_increase"
  | "credit"
  | "debit"
  | "other";

export type AdjustmentStatus = "pending" | "applied" | "waived" | "cancelled";

export type PaymentMethod =
  | "online"
  | "offline"
  | "bank_transfer"
  | "upi"
  | "cheque"
  | "other";

export type PaymentStatus = "recorded" | "verified" | "rejected" | "refunded";

export type RenewalRecordRow = {
  id: string;
  institute_id: string;
  subscription_id: string;
  subscription_period_id: string | null;
  invoice_number: string;
  status: RenewalStatus;
  period_starts_at: string;
  period_ends_at: string;
  due_at: string | null;
  issued_at: string | null;
  active_student_count: number;
  assigned_rate_inr: number | string;
  regular_amount_inr: number | string;
  discount_amount_inr: number | string;
  payable_amount_inr: number | string;
  amount_paid_inr: number | string;
  notes: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type BillingAdjustmentRow = {
  id: string;
  institute_id: string;
  subscription_id: string;
  renewal_record_id: string | null;
  kind: AdjustmentKind;
  status: AdjustmentStatus;
  purchase_student_count: number;
  live_student_count: number;
  additional_student_count: number;
  additional_monthly_inr: number | string;
  remaining_months: number;
  payable_amount_inr: number | string;
  note: string | null;
  created_by_user_id: string;
  applied_at: string | null;
  applied_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PaymentRow = {
  id: string;
  institute_id: string;
  subscription_id: string | null;
  renewal_record_id: string | null;
  billing_adjustment_id: string | null;
  amount_inr: number | string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: string | null;
  provider_ref: string | null;
  note: string | null;
  recorded_by_user_id: string;
  recorded_at: string;
  verified_by_user_id: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RenewalRecordDto = {
  id: string;
  instituteId: string;
  subscriptionId: string;
  subscriptionPeriodId: string | null;
  invoiceNumber: string;
  status: RenewalStatus;
  periodStartsAt: string;
  periodEndsAt: string;
  dueAt: string | null;
  issuedAt: string | null;
  activeStudentCount: number;
  assignedRateInr: number;
  regularAmountInr: number;
  discountAmountInr: number;
  payableAmountInr: number;
  amountPaidInr: number;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type BillingAdjustmentDto = {
  id: string;
  instituteId: string;
  subscriptionId: string;
  renewalRecordId: string | null;
  kind: AdjustmentKind;
  status: AdjustmentStatus;
  purchaseStudentCount: number;
  liveStudentCount: number;
  additionalStudentCount: number;
  additionalMonthlyInr: number;
  remainingMonths: number;
  payableAmountInr: number;
  note: string | null;
  createdByUserId: string;
  appliedAt: string | null;
  appliedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentDto = {
  id: string;
  instituteId: string;
  subscriptionId: string | null;
  renewalRecordId: string | null;
  billingAdjustmentId: string | null;
  amountInr: number;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: string | null;
  providerRef: string | null;
  note: string | null;
  recordedByUserId: string;
  recordedAt: string;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRenewalInput = {
  instituteId: string;
  subscriptionId: string;
  subscriptionPeriodId?: string | null;
  invoiceNumber: string;
  periodStartsAt: string;
  periodEndsAt: string;
  dueAt?: string | null;
  activeStudentCount?: number;
  assignedRateInr?: number;
  regularAmountInr?: number;
  discountAmountInr?: number;
  payableAmountInr?: number;
  notes?: string | null;
};

export type UpdateRenewalInput = {
  status?: RenewalStatus;
  dueAt?: string | null;
  activeStudentCount?: number;
  assignedRateInr?: number;
  regularAmountInr?: number;
  discountAmountInr?: number;
  payableAmountInr?: number;
  amountPaidInr?: number;
  notes?: string | null;
};

export type CreateAdjustmentInput = {
  instituteId: string;
  subscriptionId: string;
  renewalRecordId?: string | null;
  kind?: AdjustmentKind;
  purchaseStudentCount?: number;
  liveStudentCount?: number;
  additionalStudentCount?: number;
  additionalMonthlyInr?: number;
  remainingMonths?: number;
  payableAmountInr?: number;
  note?: string | null;
};

export type UpdateAdjustmentInput = {
  status?: AdjustmentStatus;
  purchaseStudentCount?: number;
  liveStudentCount?: number;
  additionalStudentCount?: number;
  additionalMonthlyInr?: number;
  remainingMonths?: number;
  payableAmountInr?: number;
  note?: string | null;
};

export type CreatePaymentInput = {
  instituteId: string;
  subscriptionId?: string | null;
  renewalRecordId?: string | null;
  billingAdjustmentId?: string | null;
  amountInr: number;
  method?: PaymentMethod;
  provider?: string | null;
  providerRef?: string | null;
  note?: string | null;
};
