/**
 * Nexus subscriptions API — API auth mode.
 */
import { getNexusApiClient } from "@/lib/nexus-api";
import { isNexusApiMode } from "@/lib/auth-mode";
import type { NexusApiClient } from "@/lib/api";

export type SubscriptionLifecycle =
  | "registered"
  | "approved"
  | "trial_active"
  | "trial_expiring"
  | "trial_expired"
  | "grace_period"
  | "read_only"
  | "active";

export type SubscriptionDto = {
  id: string;
  instituteId: string;
  lifecycleStatus: SubscriptionLifecycle;
  assignedRateInr: number;
  activeStudentCount: number;
  trialStartAt: string | null;
  trialEndAt: string | null;
  graceEndsAt: string | null;
  currentPeriodId: string | null;
  currentPeriod: SubscriptionPeriodDto | null;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionPeriodDto = {
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
  createdAt: string;
  updatedAt: string;
};

export type UpsertSubscriptionInput = {
  instituteId: string;
  lifecycleStatus: SubscriptionLifecycle;
  assignedRateInr: number;
  activeStudentCount?: number;
  trialStartAt?: string | null;
  trialEndAt?: string | null;
  graceEndsAt?: string | null;
};

function assertApiMode(): void {
  if (!isNexusApiMode()) {
    throw new Error("Nexus subscriptions API is only available in API auth mode");
  }
}

export async function listSubscriptions(
  instituteId?: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<SubscriptionDto[]> {
  assertApiMode();
  const query = instituteId
    ? `?${new URLSearchParams({ institute_id: instituteId }).toString()}`
    : "";
  return client.get<SubscriptionDto[]>(`/api/nexus/subscriptions${query}`);
}

export async function listSubscriptionPeriods(
  subscriptionId: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<SubscriptionPeriodDto[]> {
  assertApiMode();
  return client.get<SubscriptionPeriodDto[]>(
    `/api/nexus/subscriptions/${encodeURIComponent(subscriptionId)}/periods`,
  );
}

export async function upsertSubscription(
  input: UpsertSubscriptionInput,
  client: NexusApiClient = getNexusApiClient(),
): Promise<SubscriptionDto> {
  assertApiMode();
  return client.request<SubscriptionDto>("/api/nexus/subscriptions", {
    method: "PUT",
    body: input,
  });
}
