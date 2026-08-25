/**
 * Keep Admin platform write-gate in sync with unified subscription lifecycle.
 * Single path into platform-readonly — do not add a second read-only system.
 */
import { getAdminBoundNexusInstituteId } from "@lumenx/config";
import {
  buildSubscriptionTrialView,
  ensureRenewalReminders,
  getActiveRenewalReminderView,
  getInstituteSubscription,
  syncAdminReadOnlyFromSubscription,
  type RenewalReminderView,
  type SubscriptionTrialView,
} from "@lumenx/utils";

/** Refresh lifecycle + subscriptionExpired flag + in-app renewal reminder state. */
export function syncAdminSubscriptionAccess(): void {
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
