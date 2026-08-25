/**
 * Platform read-only reasons shared across Admin / Connect.
 * Subscription expired · Academic year locked.
 */

export const PLATFORM_READONLY_KEY = "lumenx.platform-readonly.v1";

export type PlatformReadOnlyReason =
  | "subscription_expired"
  | "academic_year_locked";

export type PlatformReadOnlyState = {
  subscriptionExpired: boolean;
  academicYearLocked: boolean;
  /** Optional human labels for UI. */
  subscriptionMessage?: string;
  academicYearMessage?: string;
  updatedAt: string;
};

export const PLATFORM_READONLY_COPY: Record<
  PlatformReadOnlyReason,
  { title: string; body: string }
> = {
  subscription_expired: {
    title: "Subscription expired",
    body: "Your institute licence has expired. The platform is read-only until payment is completed. Viewing data is allowed; creating or editing is blocked.",
  },
  academic_year_locked: {
    title: "Academic year locked",
    body: "The active academic year is locked. Historical records are view-only. Unlock or activate a year in Academic Management to make changes.",
  },
};

function defaultState(): PlatformReadOnlyState {
  return {
    subscriptionExpired: false,
    academicYearLocked: false,
    updatedAt: new Date().toISOString(),
  };
}

export function loadPlatformReadOnlyState(): PlatformReadOnlyState {
  if (typeof localStorage === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(PLATFORM_READONLY_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as PlatformReadOnlyState;
    return {
      ...defaultState(),
      ...parsed,
    };
  } catch {
    return defaultState();
  }
}

export function savePlatformReadOnlyState(
  patch: Partial<PlatformReadOnlyState>,
): PlatformReadOnlyState {
  const prev = loadPlatformReadOnlyState();
  const next: PlatformReadOnlyState = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  // Avoid event storms: banners listen to lumenx-platform-readonly-changed and
  // would re-enter sync → save → event → freeze the tab after AdminChrome mounts.
  const same =
    prev.subscriptionExpired === next.subscriptionExpired &&
    prev.academicYearLocked === next.academicYearLocked &&
    (prev.subscriptionMessage ?? "") === (next.subscriptionMessage ?? "") &&
    (prev.academicYearMessage ?? "") === (next.academicYearMessage ?? "");
  if (same) return prev;

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(PLATFORM_READONLY_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota / private mode.
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lumenx-platform-readonly-changed"));
  }
  return next;
}

export function getActiveReadOnlyReasons(
  state: PlatformReadOnlyState = loadPlatformReadOnlyState(),
): PlatformReadOnlyReason[] {
  const reasons: PlatformReadOnlyReason[] = [];
  if (state.subscriptionExpired) reasons.push("subscription_expired");
  if (state.academicYearLocked) reasons.push("academic_year_locked");
  return reasons;
}

export function isPlatformReadOnly(
  state: PlatformReadOnlyState = loadPlatformReadOnlyState(),
): boolean {
  return getActiveReadOnlyReasons(state).length > 0;
}

/** Derive subscription-expired / read-only from unified subscription lifecycle. */
export function syncSubscriptionReadOnlyFromLifecycle(
  lifecycleStatus: string,
): PlatformReadOnlyState {
  const enforce =
    lifecycleStatus === "read_only" || lifecycleStatus === "registered";
  return savePlatformReadOnlyState({
    subscriptionExpired: enforce,
    subscriptionMessage: enforce
      ? "Your subscription or trial has ended. Viewing is allowed; create/edit is blocked until payment is verified."
      : undefined,
  });
}

/** @deprecated Prefer syncSubscriptionReadOnlyFromLifecycle — maps Admin payment status. */
export function syncSubscriptionExpiredFromBilling(paymentStatus: string): PlatformReadOnlyState {
  const expired = paymentStatus === "unpaid";
  return savePlatformReadOnlyState({
    subscriptionExpired: expired,
    subscriptionMessage: expired
      ? PLATFORM_READONLY_COPY.subscription_expired.body
      : undefined,
  });
}

/** Derive academic-year-locked from active year status. */
export function syncAcademicYearLocked(input: {
  locked: boolean;
  yearLabel?: string;
}): PlatformReadOnlyState {
  return savePlatformReadOnlyState({
    academicYearLocked: input.locked,
    academicYearMessage: input.locked
      ? input.yearLabel
        ? `${PLATFORM_READONLY_COPY.academic_year_locked.body} (${input.yearLabel})`
        : PLATFORM_READONLY_COPY.academic_year_locked.body
      : undefined,
  });
}
