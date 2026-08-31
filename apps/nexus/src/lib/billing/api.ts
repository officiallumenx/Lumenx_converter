/**
 * Nexus billing review API — API auth mode only.
 */
import { getNexusApiClient } from "@/lib/nexus-api";
import { isNexusApiMode } from "@/lib/auth-mode";
import type { NexusApiClient } from "@/lib/api";
import type { OfflinePaymentSubmissionDto, PaymentDto } from "./api-types";

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
