/** Nexus billing API types — mirrors backend DTOs. */

export type OfflinePaymentSubmissionDto = {
  paymentId: string;
  renewalId: string;
  instituteId: string;
  instituteName: string;
  durationMonths: 1 | 6 | 12;
  activeStudentCount: number;
  assignedRateInr: number;
  monthlyPriceInr: number;
  regularAmountInr: number;
  discountAmountInr: number;
  payableAmountInr: number;
  freeMonths: number;
  referenceId: string;
  proofLabel: string | null;
  status: "verification_pending" | "paid" | "rejected";
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
};

export type PaymentDto = {
  id: string;
  instituteId: string;
  subscriptionId: string | null;
  renewalRecordId: string | null;
  billingAdjustmentId: string | null;
  amountInr: number;
  method: string;
  status: string;
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

export type RenewalRecordDto = {
  id: string;
  instituteId: string;
  subscriptionId: string;
  subscriptionPeriodId: string | null;
  invoiceNumber: string;
  status: string;
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

export type InvoicePdfSignedUrlDto = {
  signedUrl: string;
  expiresAt: string;
  assetId: string;
  renewalId: string;
  invoiceNumber: string;
};

export type IssueInvoiceResultDto = {
  renewal: RenewalRecordDto;
  pdf: InvoicePdfSignedUrlDto;
};
