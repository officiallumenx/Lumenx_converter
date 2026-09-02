/**
 * Keep Admin platform write-gate in sync with unified subscription lifecycle.
 * Single path into platform-readonly — do not add a second read-only system.
 */
import { getAdminBoundNexusInstituteId } from "@lumenx/config";
import {
  buildSubscriptionTrialView,
  clearInstituteSubscriptionLocal,
  ensureRenewalReminders,
  getActiveRenewalReminderView,
  getInstituteSubscription,
  hydrateInstituteSubscriptionFromApi,
  parseSubscriptionDuration,
  syncAdminReadOnlyFromSubscription,
  type InstituteSubscription,
  type RenewalReminderView,
  type SubscriptionLifecycleStatus,
  type SubscriptionPaymentStatus,
  type SubscriptionTrialView,
} from "@lumenx/utils";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getSubscriptionDetail } from "@/lib/subscriptions/api";
import type { InstituteSubscriptionDetailDto } from "@/lib/subscriptions/types";

function mapDetailToLocal(detail: InstituteSubscriptionDetailDto): InstituteSubscription {
  const period = detail.currentPeriod;
  const duration = period
    ? parseSubscriptionDuration(period.durationMonths) ?? 1
    : 1;
  return {
    instituteId: detail.instituteId,
    instituteName: detail.instituteName,
    lifecycleStatus: detail.lifecycleStatus as SubscriptionLifecycleStatus,
    assignedRateInr: detail.assignedRateInr,
    activeStudentCount: detail.activeStudentCount,
    trialStartAt: detail.trialStartAt,
    trialEndAt: detail.trialEndAt,
    graceEndsAt: detail.graceEndsAt,
    currentPeriod: period
      ? {
          durationMonths: duration,
          activeStudentCount: period.activeStudentCount,
          assignedRateInr: period.assignedRateInr,
          monthlyPriceInr: period.monthlyPriceInr,
          regularAmountInr: period.regularAmountInr,
          discountAmountInr: period.discountAmountInr,
          payableAmountInr: period.payableAmountInr,
          freeMonths: period.freeMonths,
          startAt: period.startsAt,
          endAt: period.endsAt,
          paymentMethod: period.paymentMethod,
          paymentStatus: period.paymentStatus as SubscriptionPaymentStatus,
          paymentRef: period.paymentRef ?? undefined,
          amountPaidInr: period.amountPaidInr,
          paidAt: period.paidAt ?? undefined,
        }
      : null,
    pendingOfflineSubmissionId: detail.pendingOfflinePayment?.paymentId ?? null,
    createdAt: detail.currentPeriod?.startsAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Hydrate local lifecycle banners/write-gate from GET /api/v1/subscriptions/detail. */
export async function syncAdminSubscriptionAccessFromApi(
  instituteId: string,
): Promise<void> {
  if (!instituteId.trim()) return;
  try {
    const detail = await getSubscriptionDetail(instituteId);
    if (!detail.subscriptionId && detail.lifecycleStatus === "registered") {
      // Still hydrate so registered → read-only gate matches API.
      hydrateInstituteSubscriptionFromApi(mapDetailToLocal(detail));
    } else if (!detail.subscriptionId) {
      clearInstituteSubscriptionLocal(instituteId);
    } else {
      hydrateInstituteSubscriptionFromApi(mapDetailToLocal(detail));
    }
    ensureRenewalReminders(instituteId);
  } catch {
    // Keep last known local state if network fails — never freeze Admin chrome.
  }
}

/** Refresh lifecycle + subscriptionExpired flag + in-app renewal reminder state. */
export function syncAdminSubscriptionAccess(): void {
  if (isApiAuthMode()) {
    const instituteId = getAdminBoundNexusInstituteId();
    if (instituteId) void syncAdminSubscriptionAccessFromApi(instituteId);
    return;
  }
  const instituteId = getAdminBoundNexusInstituteId();
  syncAdminReadOnlyFromSubscription(instituteId);
  ensureRenewalReminders(instituteId);
}

/** Trial / grace / read-only view model for banners (null when no subscription). */
export function getBoundSubscriptionTrialView(
  now: Date = new Date(),
): SubscriptionTrialView | null {
  const sub = getInstituteSubscription(getAdminBoundNexusInstituteId());
  if (!sub) return null;
  return buildSubscriptionTrialView(sub, now);
}

/** In-app renewal reminder (30/15/7/3/1/expired) — null outside windows or if dismissed. */
export function getBoundRenewalReminderView(
  now: Date = new Date(),
): RenewalReminderView | null {
  return getActiveRenewalReminderView(getAdminBoundNexusInstituteId(), now);
}
