/** Institute-scoped subscription read + offline renewal workflow. */

import type { SubscriptionDurationMonths } from "./pricing.js";

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

export type OfflinePaymentSubmissionDto = {
  paymentId: string;
  renewalId: string;
  instituteId: string;
  instituteName: string;
  durationMonths: SubscriptionDurationMonths;
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

export type SubscriptionHistoryRenewalDto = {
  id: string;
  invoiceNumber: string;
  status: string;
  periodStartsAt: string;
  periodEndsAt: string;
  activeStudentCount: number;
  assignedRateInr: number;
  payableAmountInr: number;
  amountPaidInr: number;
  issuedAt: string | null;
  createdAt: string;
};

export type SubscriptionHistoryPaymentDto = {
  id: string;
  renewalId: string | null;
  amountInr: number;
  method: string;
  status: string;
  providerRef: string | null;
  recordedAt: string;
  verifiedAt: string | null;
};

export type InstituteSubscriptionHistoryDto = {
  renewals: SubscriptionHistoryRenewalDto[];
  payments: SubscriptionHistoryPaymentDto[];
};

export type SubmitOfflinePaymentInput = {
  instituteId: string;
  durationMonths: SubscriptionDurationMonths;
  referenceId: string;
  proofLabel?: string | null;
};
