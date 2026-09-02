/**
 * Nexus billing review API — API auth mode only.
 */
import { getNexusApiClient } from "@/lib/nexus-api";
import { isNexusApiMode } from "@/lib/auth-mode";
import type { NexusApiClient } from "@/lib/api";
import type {
  InvoicePdfSignedUrlDto,
  IssueInvoiceResultDto,
  OfflinePaymentSubmissionDto,
  PaymentDto,
  RenewalRecordDto,
} from "./api-types";

function assertApiMode(): void {
  if (!isNexusApiMode()) {
    throw new Error("Nexus billing API is only available in API auth mode");
  }
}

export async function listPendingOfflinePayments(
  client: NexusApiClient = getNexusApiClient(),
): Promise<OfflinePaymentSubmissionDto[]> {
  assertApiMode();
  return client.get<OfflinePaymentSubmissionDto[]>("/api/nexus/billing/payments/pending");
}

export async function verifyPayment(
  paymentId: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<PaymentDto> {
  assertApiMode();
  return client.post<PaymentDto>(`/api/nexus/billing/payments/${paymentId.trim()}/verify`);
}

export async function rejectPayment(
  paymentId: string,
  reason: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<PaymentDto> {
  assertApiMode();
  return client.post<PaymentDto>(
    `/api/nexus/billing/payments/${paymentId.trim()}/reject`,
    { reason: reason.trim() },
  );
}

export async function listRenewals(
  instituteId: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<RenewalRecordDto[]> {
  assertApiMode();
  const query = new URLSearchParams({ institute_id: instituteId.trim() });
  return client.get<RenewalRecordDto[]>(`/api/nexus/billing/renewals?${query}`);
}

export async function issueInvoiceFromSubscription(
  input: {
    instituteId: string;
    durationMonths: 1 | 6 | 12;
    dueAt?: string | null;
    notes?: string | null;
  },
  client: NexusApiClient = getNexusApiClient(),
): Promise<IssueInvoiceResultDto> {
  assertApiMode();
  return client.post<IssueInvoiceResultDto>("/api/nexus/billing/renewals/issue-invoice", {
    institute_id: input.instituteId,
    duration_months: input.durationMonths,
    due_at: input.dueAt ?? null,
    notes: input.notes ?? null,
  });
}

export async function getRenewalInvoicePdf(
  renewalId: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<InvoicePdfSignedUrlDto> {
  assertApiMode();
  return client.get<InvoicePdfSignedUrlDto>(
    `/api/nexus/billing/renewals/${encodeURIComponent(renewalId.trim())}/pdf`,
  );
}
