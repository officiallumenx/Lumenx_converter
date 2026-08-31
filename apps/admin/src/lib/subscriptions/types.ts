/** Mirrors backend subscription billing DTOs (Admin API mode). */

export type InstituteSubscriptionCurrentDto = {
  plan: string;
  status: string;
  modules: Record<string, boolean>;
  studentLimit: number;
};

export type InstituteSubscriptionPeriodDto = {
  id: string;
  durationMonths: number;
  activeStudentCount: number;
  assignedRateInr: number;
  monthlyPriceInr: number;
  regularAmountInr: number;
  discountAmountInr: number;
  payableAmountInr: number;
  freeMonths: number;
  startsAt: string;
  endsAt: string;
  paymentMethod: "online" | "offline";
  paymentStatus: string;
  paymentRef: string | null;
  amountPaidInr: number;
  paidAt: string | null;
  isCurrent: boolean;
};

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

export type InstituteSubscriptionDetailDto = {
  instituteId: string;
  instituteName: string;
  subscriptionId: string | null;
  lifecycleStatus: string;
  assignedRateInr: number;
  activeStudentCount: number;
  trialStartAt: string | null;
  trialEndAt: string | null;
  graceEndsAt: string | null;
  currentPeriod: InstituteSubscriptionPeriodDto | null;
  pendingOfflinePayment: OfflinePaymentSubmissionDto | null;
};

export type SubscriptionQuoteDto = {
  activeStudentCount: number;
  assignedRateInr: number;
  durationMonths: 1 | 6 | 12;
  durationLabel: string;
  studentChargeInr: number;
  minMonthlyChargeInr: number;
  monthlyPriceInr: number;
  floorApplied: boolean;
  showAsBaseSubscription: boolean;
  freeMonths: number;
  billableMonths: number;
  regularAmountInr: number;
  discountAmountInr: number;
  payableAmountInr: number;
};

export type InstituteSubscriptionHistoryDto = {
  renewals: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    periodStartsAt: string;
    periodEndsAt: string;
    activeStudentCount: number;
    assignedRateInr: number;
    payableAmountInr: number;
    amountPaidInr: number;
    createdAt: string;
  }>;
  payments: Array<{
    id: string;
    renewalId: string | null;
    amountInr: number;
    method: string;
    status: string;
    providerRef: string | null;
    recordedAt: string;
    verifiedAt: string | null;
  }>;
};

export type SubmitOfflinePaymentInput = {
  instituteId: string;
  durationMonths: 1 | 6 | 12;
  referenceId: string;
  proofLabel?: string;
};
