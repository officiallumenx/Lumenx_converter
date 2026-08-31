/**
 * Institute subscription billing API — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  InstituteSubscriptionCurrentDto,
  InstituteSubscriptionDetailDto,
  InstituteSubscriptionHistoryDto,
  OfflinePaymentSubmissionDto,
  SubmitOfflinePaymentInput,
  SubscriptionQuoteDto,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Subscriptions API is only available in API auth mode");
  }
}

export { assertApiMode };

function instituteQuery(instituteId: string): string {
  return new URLSearchParams({ institute_id: instituteId.trim() }).toString();
}

export async function getCurrentSubscription(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<InstituteSubscriptionCurrentDto> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.get<InstituteSubscriptionCurrentDto>(
    `/api/v1/subscriptions/current?${instituteQuery(instituteId)}`,
  );
}

export async function getSubscriptionDetail(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<InstituteSubscriptionDetailDto> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.get<InstituteSubscriptionDetailDto>(
    `/api/v1/subscriptions/detail?${instituteQuery(instituteId)}`,
  );
}

export async function getSubscriptionQuotes(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<SubscriptionQuoteDto[]> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const data = await client.get<SubscriptionQuoteDto[] | SubscriptionQuoteDto>(
    `/api/v1/subscriptions/quote?${instituteQuery(instituteId)}`,
  );
  return Array.isArray(data) ? data : [data];
}

export async function getSubscriptionQuote(
  instituteId: string,
  durationMonths: 1 | 6 | 12,
  client: AdminApiClient = getAdminApiClient(),
): Promise<SubscriptionQuoteDto> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams({
    institute_id: instituteId.trim(),
    duration_months: String(durationMonths),
  });
  return client.get<SubscriptionQuoteDto>(
    `/api/v1/subscriptions/quote?${query.toString()}`,
  );
}

export async function getSubscriptionHistory(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<InstituteSubscriptionHistoryDto> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.get<InstituteSubscriptionHistoryDto>(
    `/api/v1/subscriptions/history?${instituteQuery(instituteId)}`,
  );
}

export async function submitOfflinePayment(
  input: SubmitOfflinePaymentInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<OfflinePaymentSubmissionDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<OfflinePaymentSubmissionDto>(
    "/api/v1/subscriptions/offline-payments",
    {
      institute_id: input.instituteId.trim(),
      duration_months: input.durationMonths,
      reference_id: input.referenceId.trim(),
      proof_label: input.proofLabel?.trim() || null,
    },
  );
}
