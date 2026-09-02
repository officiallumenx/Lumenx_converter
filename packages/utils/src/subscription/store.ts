/**
 * Unified institute subscription store (Admin ↔ Nexus demo).
 * Single source of truth for lifecycle, pricing settings, renewals, payments.
 *
 * localStorage + cookie (cross-port localhost) + event; immutable renewals/payments.
 */

import {
  DEFAULT_PER_STUDENT_RATE_INR,
  SUBSCRIPTION_CHANGED_EVENT,
  SUBSCRIPTION_POLICY,
  SUBSCRIPTION_STORAGE_KEY,
} from "./policy";
import {
  buildTrialWindow,
  deriveSubscriptionLifecycle,
  shouldEnforceSubscriptionReadOnly,
  addUtcDays,
} from "./lifecycle";
import { calculateSubscriptionQuote, normalizeAssignedRate } from "./pricing";
import {
  buildReminderState,
  buildRenewalReminderView,
  resolveReminderExpiryAt,
  type RenewalReminderView,
} from "./reminders";
import { ComingSoonOnlinePaymentAdapter } from "./payment-adapter";
import { buildRenewalSnapshot, DEFAULT_ADJUSTMENT_REASON } from "./history";
import { savePlatformReadOnlyState } from "../platform-readonly";
import type { SubscriptionDurationMonths } from "./policy";
import type {
  BillingAdjustment,
  InstituteSubscription,
  OfflinePaymentSubmission,
  PaymentRecord,
  RenewalRecord,
  RenewalReminderState,
  SubscriptionStoreState,
} from "./types";
import { quoteFromPaidPeriod } from "./adjustments";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyState(): SubscriptionStoreState {
  return {
    version: 1,
    subscriptions: [],
    renewals: [],
    payments: [],
    offlineSubmissions: [],
    reminders: [],
    billingAdjustments: [],
  };
}

const COOKIE_NAME = "lumenx_platform_subscriptions_v1";

/** Prefer newest offline submissions + live subscriptions so Admin ↔ Nexus stay in sync. */
function slimForCookie(state: SubscriptionStoreState): SubscriptionStoreState {
  return {
    version: 1,
    subscriptions: state.subscriptions.slice(0, 80),
    renewals: state.renewals.slice(0, 40),
    payments: state.payments.slice(0, 40),
    offlineSubmissions: state.offlineSubmissions.slice(0, 60),
    reminders: state.reminders.slice(0, 40),
    billingAdjustments: state.billingAdjustments.slice(0, 60),
  };
}

function readCookieState(): SubscriptionStoreState | null {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;
    const raw = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
    const parsed = JSON.parse(raw) as SubscriptionStoreState;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.subscriptions)) {
      return null;
    }
    return {
      version: 1,
      subscriptions: parsed.subscriptions ?? [],
      renewals: parsed.renewals ?? [],
      payments: parsed.payments ?? [],
      offlineSubmissions: parsed.offlineSubmissions ?? [],
      reminders: parsed.reminders ?? [],
      billingAdjustments: parsed.billingAdjustments ?? [],
    };
  } catch {
    return null;
  }
}

function writeCookieState(state: SubscriptionStoreState): void {
  if (typeof document === "undefined") return;
  try {
    const slim = slimForCookie(state);
    const value = encodeURIComponent(JSON.stringify(slim));
    // Shared across localhost ports (cookies ignore port) for Admin ↔ Nexus demo.
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  } catch {
    // Cookie quota / disabled — localStorage still works same-origin
  }
}

function mergeById<T extends { [K in IdKey]: string }, IdKey extends string>(
  primary: T[],
  secondary: T[],
  idKey: IdKey,
  newer: (a: T, b: T) => boolean,
): T[] {
  const map = new Map<string, T>();
  for (const row of secondary) map.set(row[idKey], row);
  for (const row of primary) {
    const prev = map.get(row[idKey]);
    if (!prev || newer(row, prev)) map.set(row[idKey], row);
  }
  return [...map.values()];
}

function mergeStates(
  primary: SubscriptionStoreState,
  secondary: SubscriptionStoreState | null,
): SubscriptionStoreState {
  if (!secondary) return primary;
  return {
    version: 1,
    subscriptions: mergeById(
      primary.subscriptions,
      secondary.subscriptions,
      "instituteId",
      (a, b) => a.updatedAt >= b.updatedAt,
    ),
    renewals: mergeById(
      primary.renewals,
      secondary.renewals,
      "renewalId",
      (a, b) => a.createdAt >= b.createdAt,
    ),
    payments: mergeById(
      primary.payments,
      secondary.payments,
      "paymentId",
      (a, b) => (a.resolvedAt ?? a.createdAt) >= (b.resolvedAt ?? b.createdAt),
    ),
    offlineSubmissions: mergeById(
      primary.offlineSubmissions,
      secondary.offlineSubmissions,
      "submissionId",
      (a, b) => (a.reviewedAt ?? a.submittedAt) >= (b.reviewedAt ?? b.submittedAt),
    ),
    reminders: mergeById(
      primary.reminders,
      secondary.reminders,
      "id",
      (a, b) => a.createdAt >= b.createdAt,
    ),
    billingAdjustments: mergeById(
      primary.billingAdjustments ?? [],
      secondary.billingAdjustments ?? [],
      "adjustmentId",
      (a, b) => a.updatedAt >= b.updatedAt,
    ),
  };
}

function readLocalState(): SubscriptionStoreState {
  if (typeof localStorage === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as SubscriptionStoreState;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.subscriptions)) {
      return emptyState();
    }
    return {
      version: 1,
      subscriptions: parsed.subscriptions ?? [],
      renewals: parsed.renewals ?? [],
      payments: parsed.payments ?? [],
      offlineSubmissions: parsed.offlineSubmissions ?? [],
      reminders: parsed.reminders ?? [],
      billingAdjustments: parsed.billingAdjustments ?? [],
    };
  } catch {
    return emptyState();
  }
}

function readState(): SubscriptionStoreState {
  const local = readLocalState();
  const merged = mergeStates(local, readCookieState());
  if (
    typeof localStorage !== "undefined" &&
    JSON.stringify(merged) !== JSON.stringify(local)
  ) {
    try {
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
  }
  return merged;
}

function writeState(state: SubscriptionStoreState): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(state));
  }
  writeCookieState(state);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SUBSCRIPTION_CHANGED_EVENT));
  }
}

function refreshLifecycle(sub: InstituteSubscription, now = new Date()): InstituteSubscription {
  const lifecycleStatus = deriveSubscriptionLifecycle(sub, now);
  if (lifecycleStatus === sub.lifecycleStatus) return sub;
  return { ...sub, lifecycleStatus, updatedAt: nowIso() };
}

function syncReadOnlyFlag(sub: InstituteSubscription): void {
  const enforce = shouldEnforceSubscriptionReadOnly(sub.lifecycleStatus);
  savePlatformReadOnlyState({
    subscriptionExpired: enforce,
    subscriptionMessage: enforce
      ? "Your trial and grace period have ended. Data is safe — view, search, and reports remain available. Create, edit, delete, publish, and submit are blocked until payment is verified."
      : undefined,
  });
}

function upsertSubscription(
  state: SubscriptionStoreState,
  next: InstituteSubscription,
): SubscriptionStoreState {
  const idx = state.subscriptions.findIndex((s) => s.instituteId === next.instituteId);
  const subscriptions = state.subscriptions.slice();
  if (idx >= 0) subscriptions[idx] = next;
  else subscriptions.unshift(next);
  return { ...state, subscriptions };
}

// ── Reads ─────────────────────────────────────────────────────

export function listInstituteSubscriptions(): InstituteSubscription[] {
  return readState().subscriptions.map((s) => refreshLifecycle(s));
}

export function getInstituteSubscription(
  instituteId: string,
): InstituteSubscription | null {
  const raw = readState().subscriptions.find((s) => s.instituteId === instituteId);
  if (!raw) return null;
  return refreshLifecycle(raw);
}

export function listRenewalRecords(instituteId?: string): RenewalRecord[] {
  const all = readState()
    .renewals.slice()
    .map((r) =>
      buildRenewalSnapshot({
        ...r,
        minMonthlyChargeInr: r.minMonthlyChargeInr,
      }),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!instituteId) return all;
  return all.filter((r) => r.instituteId === instituteId);
}

export function listPaymentRecords(instituteId?: string): PaymentRecord[] {
  const all = readState().payments.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!instituteId) return all;
  return all.filter((p) => p.instituteId === instituteId);
}

export function listOfflinePaymentSubmissions(
  filter?: "verification_pending" | "all",
): OfflinePaymentSubmission[] {
  const all = readState()
    .offlineSubmissions.slice()
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  if (filter === "verification_pending") {
    return all.filter((s) => s.status === "verification_pending");
  }
  return all;
}

export function listRenewalReminders(instituteId?: string): RenewalReminderState[] {
  const all = readState().reminders;
  if (!instituteId) return all;
  return all.filter((r) => r.instituteId === instituteId);
}

export function subscribeSubscriptions(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === SUBSCRIPTION_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(SUBSCRIPTION_CHANGED_EVENT, listener);
  window.addEventListener("focus", listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SUBSCRIPTION_CHANGED_EVENT, listener);
    window.removeEventListener("focus", listener);
  };
}

// ── Mutations ─────────────────────────────────────────────────

/**
 * Start 60-day trial when Nexus approves registration (or creates institute).
 */
export function startInstituteTrial(input: {
  instituteId: string;
  instituteName: string;
  assignedRateInr?: number;
  activeStudentCount?: number;
  trialStartAt?: string;
}): InstituteSubscription {
  const state = readState();
  const existing = state.subscriptions.find((s) => s.instituteId === input.instituteId);
  if (existing?.trialStartAt && existing.trialEndAt) {
    const refreshed = refreshLifecycle(existing);
    writeState(upsertSubscription(state, refreshed));
    return refreshed;
  }

  const window = buildTrialWindow(input.trialStartAt ?? nowIso());
  const sub: InstituteSubscription = {
    instituteId: input.instituteId,
    instituteName: input.instituteName.trim() || "Institute",
    lifecycleStatus: "trial_active",
    assignedRateInr: normalizeAssignedRate(
      input.assignedRateInr ?? DEFAULT_PER_STUDENT_RATE_INR,
    ),
    activeStudentCount: Math.max(0, Math.round(input.activeStudentCount ?? 0)),
    trialStartAt: window.trialStartAt,
    trialEndAt: window.trialEndAt,
    graceEndsAt: window.graceEndsAt,
    currentPeriod: null,
    pendingOfflineSubmissionId: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const refreshed = refreshLifecycle(sub);
  writeState(upsertSubscription(state, refreshed));
  syncReadOnlyFlag(refreshed);
  return refreshed;
}

/** Nexus-only: set per-student rate (Admin cannot call meaningfully). */
export function setInstituteAssignedRate(
  instituteId: string,
  rateInr: number,
): InstituteSubscription | null {
  const state = readState();
  const cur = state.subscriptions.find((s) => s.instituteId === instituteId);
  if (!cur) return null;
  // Live commercial rate only — renewal / payment / paid adjustment history is untouched.
  const next = refreshLifecycle({
    ...cur,
    assignedRateInr: normalizeAssignedRate(rateInr),
    updatedAt: nowIso(),
  });
  writeState(upsertSubscription(state, next));
  return next;
}

/** Update live student count used for quotes (does not mutate renewal history). */
export function setInstituteActiveStudentCount(
  instituteId: string,
  count: number,
): InstituteSubscription | null {
  const state = readState();
  const cur = state.subscriptions.find((s) => s.instituteId === instituteId);
  if (!cur) return null;
  const next = refreshLifecycle({
    ...cur,
    activeStudentCount: Math.max(0, Math.round(count)),
    updatedAt: nowIso(),
  });
  writeState(upsertSubscription(state, next));
  return next;
}

/** Recompute lifecycle for one or all institutes (call on Admin/Nexus focus). */
export function refreshAllSubscriptionLifecycles(now = new Date()): void {
  const state = readState();
  let changed = false;
  const subscriptions = state.subscriptions.map((s) => {
    const next = refreshLifecycle(s, now);
    if (next !== s) changed = true;
    return next;
  });
  if (!changed) return;
  writeState({ ...state, subscriptions });
}

/**
 * Online payment — adapter entry (Coming Soon).
 * Does NOT activate subscription. Does NOT record a successful payment.
 * Offline + Nexus approve remains the only path to ACTIVE.
 *
 * @deprecated Prefer beginOnlineCheckout from payment-adapter (same behaviour).
 */
export function startOnlineCheckoutPlaceholder(input: {
  instituteId: string;
  durationMonths: SubscriptionDurationMonths;
}): { ok: false; reason: "online_coming_soon"; message: string; activatesSubscription: false } {
  const result = ComingSoonOnlinePaymentAdapter.beginCheckout({
    instituteId: input.instituteId,
    durationMonths: input.durationMonths,
    payableAmountInr: 0,
    currency: "INR",
  });
  // Adapter may be async; Coming Soon is sync and always fails without activating.
  if (result instanceof Promise) {
    return {
      ok: false,
      reason: "online_coming_soon",
      message: "Online payments are coming soon.",
      activatesSubscription: false,
    };
  }
  if (result.ok !== false) {
    return {
      ok: false,
      reason: "online_coming_soon",
      message: "Online payments are coming soon.",
      activatesSubscription: false,
    };
  }
  return {
    ok: false,
    reason: "online_coming_soon",
    message: result.message,
    activatesSubscription: false,
  };
}

/**
 * Admin offline payment submission → verification_pending (no auto-activate).
 * Does NOT set lifecycle to active / paid.
 */
export function submitOfflinePayment(input: {
  instituteId: string;
  durationMonths: SubscriptionDurationMonths;
  referenceId: string;
  proofLabel?: string;
}): OfflinePaymentSubmission | null {
  const state = readState();
  const cur = state.subscriptions.find((s) => s.instituteId === input.instituteId);
  if (!cur) return null;

  const existingPending = state.offlineSubmissions.find(
    (s) =>
      s.instituteId === input.instituteId && s.status === "verification_pending",
  );
  if (existingPending) {
    // One pending submission at a time — do not create duplicates or activate.
    return existingPending;
  }

  const quote = calculateSubscriptionQuote({
    activeStudentCount: cur.activeStudentCount,
    assignedRateInr: cur.assignedRateInr,
    durationMonths: input.durationMonths,
  });

  const submission: OfflinePaymentSubmission = {
    submissionId: newId("off"),
    instituteId: cur.instituteId,
    instituteName: cur.instituteName,
    durationMonths: quote.durationMonths,
    activeStudentCount: quote.activeStudentCount,
    assignedRateInr: quote.assignedRateInr,
    monthlyPriceInr: quote.monthlyPriceInr,
    regularAmountInr: quote.regularAmountInr,
    discountAmountInr: quote.discountAmountInr,
    payableAmountInr: quote.payableAmountInr,
    freeMonths: quote.freeMonths,
    referenceId: input.referenceId.trim() || newId("REF"),
    proofLabel: input.proofLabel?.trim() || undefined,
    status: "verification_pending",
    submittedAt: nowIso(),
  };

  const payment: PaymentRecord = {
    paymentId: newId("pay"),
    instituteId: cur.instituteId,
    method: "offline",
    status: "verification_pending",
    amountInr: quote.payableAmountInr,
    reference: submission.referenceId,
    createdAt: nowIso(),
  };

  // Keep existing lifecycle (trial / grace / read_only) — never jump to active here.
  const nextSub = refreshLifecycle({
    ...cur,
    pendingOfflineSubmissionId: submission.submissionId,
    updatedAt: nowIso(),
  });

  writeState({
    ...upsertSubscription(state, nextSub),
    offlineSubmissions: [submission, ...state.offlineSubmissions],
    payments: [payment, ...state.payments],
  });

  return submission;
}

export function getOfflinePaymentSubmission(
  submissionId: string,
): OfflinePaymentSubmission | null {
  return (
    readState().offlineSubmissions.find((s) => s.submissionId === submissionId) ??
    null
  );
}

export function labelOfflinePaymentStatus(
  status: OfflinePaymentSubmission["status"],
): string {
  if (status === "verification_pending") return "VERIFICATION_PENDING";
  if (status === "paid") return "PAID";
  return "REJECTED";
}

/**
 * Nexus approves offline payment → Paid + Active + immutable renewal.
 * Updates existing payment row in place (never deletes). Clears Admin read-only via lifecycle.
 */
export function approveOfflinePayment(
  submissionId: string,
  opts?: { reviewedBy?: string; paymentId?: string },
): InstituteSubscription | null {
  const state = readState();
  const subIdx = state.offlineSubmissions.findIndex((s) => s.submissionId === submissionId);
  if (subIdx < 0) return null;
  const submission = state.offlineSubmissions[subIdx]!;
  if (submission.status !== "verification_pending") return null;

  const cur = state.subscriptions.find((s) => s.instituteId === submission.instituteId);
  if (!cur) return null;

  const startAt = nowIso();
  const endAt = addUtcDays(startAt, submission.durationMonths * 30);
  const renewalId = newId("ren");
  const reviewedBy = opts?.reviewedBy ?? "Nexus Operator";
  const resolvedAt = nowIso();

  // Prefer the original verification_pending payment row — update, never delete.
  const payIdx = state.payments.findIndex(
    (p) =>
      p.instituteId === submission.instituteId &&
      p.method === "offline" &&
      p.status === "verification_pending" &&
      p.reference === submission.referenceId,
  );
  const paymentId =
    opts?.paymentId ??
    (payIdx >= 0 ? state.payments[payIdx]!.paymentId : newId("pay"));

  const renewal = buildRenewalSnapshot({
    renewalId,
    instituteId: cur.instituteId,
    instituteName: cur.instituteName,
    durationMonths: submission.durationMonths,
    activeStudentCountAtPurchase: submission.activeStudentCount,
    assignedRateInrAtPurchase: submission.assignedRateInr,
    monthlyPriceInr: submission.monthlyPriceInr,
    regularAmountInr: submission.regularAmountInr,
    discountAmountInr: submission.discountAmountInr,
    payableAmountInr: submission.payableAmountInr,
    freeMonths: submission.freeMonths,
    paymentMethod: "offline",
    paymentStatus: "paid",
    subscriptionStartAt: startAt,
    subscriptionEndAt: endAt,
    paymentId,
    paymentRef: submission.referenceId,
    createdAt: resolvedAt,
  });

  const paidPayment: PaymentRecord = {
    paymentId,
    instituteId: cur.instituteId,
    renewalId,
    method: "offline",
    status: "paid",
    amountInr: submission.payableAmountInr,
    reference: submission.referenceId,
    note: "Approved by Nexus",
    createdAt: payIdx >= 0 ? state.payments[payIdx]!.createdAt : submission.submittedAt,
    resolvedAt,
    resolvedBy: reviewedBy,
  };

  const payments = state.payments.slice();
  if (payIdx >= 0) payments[payIdx] = paidPayment;
  else payments.unshift(paidPayment);

  const updatedSubmission: OfflinePaymentSubmission = {
    ...submission,
    status: "paid",
    reviewedAt: resolvedAt,
    reviewedBy,
    renewalId,
  };

  const offlineSubmissions = state.offlineSubmissions.slice();
  offlineSubmissions[subIdx] = updatedSubmission;

  const nextSub = refreshLifecycle({
    ...cur,
    pendingOfflineSubmissionId: null,
    graceEndsAt: addUtcDays(endAt, SUBSCRIPTION_POLICY.graceDays),
    currentPeriod: {
      durationMonths: submission.durationMonths,
      activeStudentCount: submission.activeStudentCount,
      assignedRateInr: submission.assignedRateInr,
      monthlyPriceInr: submission.monthlyPriceInr,
      regularAmountInr: submission.regularAmountInr,
      discountAmountInr: submission.discountAmountInr,
      payableAmountInr: submission.payableAmountInr,
      freeMonths: submission.freeMonths,
      startAt,
      endAt,
      paymentMethod: "offline",
      paymentStatus: "paid",
      paymentId,
      paymentRef: submission.referenceId,
      amountPaidInr: submission.payableAmountInr,
      paidAt: resolvedAt,
    },
    updatedAt: resolvedAt,
  });

  writeState({
    ...upsertSubscription(state, nextSub),
    offlineSubmissions,
    renewals: [renewal, ...state.renewals],
    payments,
  });
  syncReadOnlyFlag(nextSub);
  return nextSub;
}

/**
 * Nexus rejects offline payment — subscription does NOT become Active.
 * Updates existing payment row to REJECTED (never deletes). Lifecycle stays grace/read_only/etc.
 */
export function rejectOfflinePayment(
  submissionId: string,
  opts: { reason: string; reviewedBy?: string },
): OfflinePaymentSubmission | null {
  const state = readState();
  const subIdx = state.offlineSubmissions.findIndex((s) => s.submissionId === submissionId);
  if (subIdx < 0) return null;
  const submission = state.offlineSubmissions[subIdx]!;
  if (submission.status !== "verification_pending") return null;

  const reviewedBy = opts.reviewedBy ?? "Nexus Operator";
  const resolvedAt = nowIso();
  const reason = opts.reason.trim() || "Payment rejected";

  const updated: OfflinePaymentSubmission = {
    ...submission,
    status: "rejected",
    rejectionReason: reason,
    reviewedAt: resolvedAt,
    reviewedBy,
  };

  const offlineSubmissions = state.offlineSubmissions.slice();
  offlineSubmissions[subIdx] = updated;

  const cur = state.subscriptions.find((s) => s.instituteId === submission.instituteId);
  let nextState: SubscriptionStoreState = { ...state, offlineSubmissions };

  if (cur) {
    const nextSub = refreshLifecycle({
      ...cur,
      pendingOfflineSubmissionId:
        cur.pendingOfflineSubmissionId === submissionId
          ? null
          : cur.pendingOfflineSubmissionId,
      updatedAt: resolvedAt,
    });
    nextState = upsertSubscription(nextState, nextSub);
    // Keep whatever access mode trial/grace/read_only imply — do not activate.
    syncReadOnlyFlag(nextSub);
  }

  const payIdx = nextState.payments.findIndex(
    (p) =>
      p.instituteId === submission.instituteId &&
      p.method === "offline" &&
      p.status === "verification_pending" &&
      p.reference === submission.referenceId,
  );

  const rejectedPayment: PaymentRecord = {
    paymentId: payIdx >= 0 ? nextState.payments[payIdx]!.paymentId : newId("pay"),
    instituteId: submission.instituteId,
    method: "offline",
    status: "rejected",
    amountInr: submission.payableAmountInr,
    reference: submission.referenceId,
    note: reason,
    createdAt: payIdx >= 0 ? nextState.payments[payIdx]!.createdAt : submission.submittedAt,
    resolvedAt,
    resolvedBy: reviewedBy,
  };

  const payments = nextState.payments.slice();
  if (payIdx >= 0) payments[payIdx] = rejectedPayment;
  else payments.unshift(rejectedPayment);

  writeState({ ...nextState, payments });
  return updated;
}

/** Nexus ops: extend trial end by N days (does not delete data). */
export function extendInstituteTrial(
  instituteId: string,
  extraDays: number,
): InstituteSubscription | null {
  const state = readState();
  const cur = state.subscriptions.find((s) => s.instituteId === instituteId);
  if (!cur?.trialEndAt) return null;
  const trialEndAt = addUtcDays(cur.trialEndAt, Math.max(0, Math.round(extraDays)));
  const graceEndsAt = addUtcDays(trialEndAt, SUBSCRIPTION_POLICY.graceDays);
  const next = refreshLifecycle({
    ...cur,
    trialEndAt,
    graceEndsAt,
    updatedAt: nowIso(),
  });
  writeState(upsertSubscription(state, next));
  syncReadOnlyFlag(next);
  return next;
}

/**
 * Nexus ops: force-activate a paid period (manual / exceptional).
 * Still writes an immutable renewal record.
 */
export function activateSubscriptionManual(input: {
  instituteId: string;
  durationMonths: SubscriptionDurationMonths;
  reviewedBy?: string;
  note?: string;
}): InstituteSubscription | null {
  const state = readState();
  const cur = state.subscriptions.find((s) => s.instituteId === input.instituteId);
  if (!cur) return null;

  const quote = calculateSubscriptionQuote({
    activeStudentCount: cur.activeStudentCount,
    assignedRateInr: cur.assignedRateInr,
    durationMonths: input.durationMonths,
  });

  const startAt = nowIso();
  const endAt = addUtcDays(startAt, quote.durationMonths * 30);
  const renewalId = newId("ren");
  const paymentId = newId("pay");

  const renewal = buildRenewalSnapshot({
    renewalId,
    instituteId: cur.instituteId,
    instituteName: cur.instituteName,
    durationMonths: quote.durationMonths,
    activeStudentCountAtPurchase: quote.activeStudentCount,
    assignedRateInrAtPurchase: quote.assignedRateInr,
    monthlyPriceInr: quote.monthlyPriceInr,
    regularAmountInr: quote.regularAmountInr,
    discountAmountInr: quote.discountAmountInr,
    payableAmountInr: quote.payableAmountInr,
    freeMonths: quote.freeMonths,
    paymentMethod: "offline",
    paymentStatus: "paid",
    subscriptionStartAt: startAt,
    subscriptionEndAt: endAt,
    paymentId,
    paymentRef: input.note ?? "manual-activate",
    createdAt: nowIso(),
  });

  const next = refreshLifecycle({
    ...cur,
    pendingOfflineSubmissionId: null,
    graceEndsAt: addUtcDays(endAt, SUBSCRIPTION_POLICY.graceDays),
    currentPeriod: {
      durationMonths: quote.durationMonths,
      activeStudentCount: quote.activeStudentCount,
      assignedRateInr: quote.assignedRateInr,
      monthlyPriceInr: quote.monthlyPriceInr,
      regularAmountInr: quote.regularAmountInr,
      discountAmountInr: quote.discountAmountInr,
      payableAmountInr: quote.payableAmountInr,
      freeMonths: quote.freeMonths,
      startAt,
      endAt,
      paymentMethod: "offline",
      paymentStatus: "paid",
      paymentId,
      paymentRef: renewal.paymentRef,
      amountPaidInr: quote.payableAmountInr,
      paidAt: nowIso(),
    },
    updatedAt: nowIso(),
  });

  writeState({
    ...upsertSubscription(state, next),
    renewals: [renewal, ...state.renewals],
    payments: [
      {
        paymentId,
        instituteId: cur.instituteId,
        renewalId,
        method: "offline",
        status: "paid",
        amountInr: quote.payableAmountInr,
        reference: renewal.paymentRef,
        note: input.note,
        createdAt: nowIso(),
        resolvedAt: nowIso(),
        resolvedBy: input.reviewedBy ?? "Nexus Operator",
      },
      ...state.payments,
    ],
  });
  syncReadOnlyFlag(next);
  return next;
}

/**
 * Ensure in-app reminder state exists for the current expiry window (idempotent by id).
 * Same institute + kind + expiry date never creates a duplicate row.
 */
export function ensureRenewalReminders(instituteId: string, now = new Date()): void {
  const sub = getInstituteSubscription(instituteId);
  if (!sub) return;
  const target = resolveReminderExpiryAt(sub);
  if (!target) return;
  const built = buildReminderState({ instituteId, targetExpiryAt: target, now });
  if (!built) return;
  const state = readState();
  if (state.reminders.some((r) => r.id === built.id)) return;
  writeState({ ...state, reminders: [built, ...state.reminders] });
}

/**
 * Ensure + return the current undismissed in-app reminder view (null outside windows).
 * Does not send SMS / email / push — storage only.
 */
export function getActiveRenewalReminderView(
  instituteId: string,
  now = new Date(),
): RenewalReminderView | null {
  ensureRenewalReminders(instituteId, now);
  const sub = getInstituteSubscription(instituteId);
  if (!sub) return null;
  const target = resolveReminderExpiryAt(sub);
  if (!target) return null;
  const built = buildReminderState({ instituteId, targetExpiryAt: target, now });
  if (!built) return null;
  const stored = listRenewalReminders(instituteId).find((r) => r.id === built.id);
  if (!stored || stored.dismissedAt) return null;
  return buildRenewalReminderView({ sub, reminder: stored, now });
}

/** Dismiss an in-app reminder so the banner stops repeating for that stored id. */
export function dismissRenewalReminder(reminderId: string): void {
  const state = readState();
  const idx = state.reminders.findIndex((r) => r.id === reminderId);
  if (idx < 0) return;
  const row = state.reminders[idx]!;
  if (row.dismissedAt) return;
  const reminders = state.reminders.slice();
  reminders[idx] = { ...row, dismissedAt: nowIso() };
  writeState({ ...state, reminders });
}

/**
 * Sync Admin platform read-only flag from this institute's subscription lifecycle.
 * Uses the shared platform-readonly write-gate — no second lock system.
 * When no subscription exists for the bound institute, clear subscription RO.
 */
export function syncAdminReadOnlyFromSubscription(instituteId: string): void {
  refreshAllSubscriptionLifecycles();
  const sub = getInstituteSubscription(instituteId);
  if (!sub) {
    savePlatformReadOnlyState({
      subscriptionExpired: false,
      subscriptionMessage: undefined,
    });
    return;
  }
  syncReadOnlyFlag(sub);
}

/**
 * Replace local subscription row with API/DB truth (Admin API mode hydrate).
 * Does not invent trial windows — uses lifecycle/period from the server as-is.
 */
export function hydrateInstituteSubscriptionFromApi(
  input: InstituteSubscription,
): InstituteSubscription {
  const next = refreshLifecycle({
    ...input,
    instituteName: input.instituteName.trim() || "Institute",
    assignedRateInr: normalizeAssignedRate(input.assignedRateInr),
    activeStudentCount: Math.max(0, Math.round(input.activeStudentCount)),
    updatedAt: nowIso(),
  });
  const state = readState();
  writeState(upsertSubscription(state, next));
  syncReadOnlyFlag(next);
  return next;
}

/** Remove local subscription row when API has no subscription for the institute. */
export function clearInstituteSubscriptionLocal(instituteId: string): void {
  const state = readState();
  const nextSubs = state.subscriptions.filter((s) => s.instituteId !== instituteId);
  if (nextSubs.length === state.subscriptions.length) {
    savePlatformReadOnlyState({
      subscriptionExpired: false,
      subscriptionMessage: undefined,
    });
    return;
  }
  writeState({ ...state, subscriptions: nextSubs });
  savePlatformReadOnlyState({
    subscriptionExpired: false,
    subscriptionMessage: undefined,
  });
}

/** Full immutable billing history for an institute (subscription + renewals + payments + adjustments). */
export function getInstituteBillingHistory(instituteId: string): {
  instituteId: string;
  subscription: InstituteSubscription | null;
  renewals: RenewalRecord[];
  payments: PaymentRecord[];
  adjustments: BillingAdjustment[];
} {
  return {
    instituteId,
    subscription: getInstituteSubscription(instituteId),
    renewals: listRenewalRecords(instituteId),
    payments: listPaymentRecords(instituteId),
    adjustments: listBillingAdjustments(instituteId),
  };
}

// ── Post-renewal billing adjustments ──────────────────────────

function periodKey(startAt: string, endAt: string): string {
  return `${startAt}|${endAt}`;
}

export function listBillingAdjustments(
  instituteId?: string,
): BillingAdjustment[] {
  const all = (readState().billingAdjustments ?? [])
    .slice()
    .map((a) => ({
      ...a,
      reason: a.reason?.trim() ? a.reason : DEFAULT_ADJUSTMENT_REASON,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (!instituteId) return all;
  return all.filter((a) => a.instituteId === instituteId);
}

export function getPendingBillingAdjustment(
  instituteId: string,
): BillingAdjustment | null {
  return (
    listBillingAdjustments(instituteId).find(
      (a) => a.status === "pending" || a.status === "verification_pending",
    ) ?? null
  );
}

/**
 * After students are added: update live headcount and create/update a consolidated
 * pending adjustment when the paid period is above the floor delta.
 * No-op during trial / without a paid currentPeriod. Never mutates renewals or snapshot.
 */
export function syncPostRenewalHeadcount(input: {
  instituteId: string;
  liveStudentCount: number;
  now?: Date;
}): BillingAdjustment | null {
  const state = readState();
  const cur = state.subscriptions.find((s) => s.instituteId === input.instituteId);
  if (!cur) return null;

  const live = Math.max(0, Math.round(input.liveStudentCount));
  const now = input.now ?? new Date();

  let nextSub = refreshLifecycle({
    ...cur,
    activeStudentCount: live,
    updatedAt: nowIso(),
  });

  const period = nextSub.currentPeriod;
  const inPaidPeriod =
    nextSub.lifecycleStatus === "active" &&
    period?.paymentStatus === "paid" &&
    period.startAt &&
    period.endAt;

  // Freeze a copy of renewals to assert we never rewrite them.
  const renewalsFrozen = state.renewals.map((r) => ({ ...r }));

  let adjustments = (state.billingAdjustments ?? []).slice();

  if (!inPaidPeriod || !period) {
    // Trial / unpaid — clear any stale pending for this institute (no charge).
    adjustments = adjustments.map((a) =>
      a.instituteId === input.instituteId && a.status === "pending"
        ? { ...a, status: "cancelled" as const, updatedAt: nowIso() }
        : a,
    );
    writeState({
      ...upsertSubscription(state, nextSub),
      billingAdjustments: adjustments,
      renewals: renewalsFrozen,
    });
    return null;
  }

  const quote = quoteFromPaidPeriod(period, live, now);

  // Find open pending (or verification_pending) for this period — consolidate.
  const openIdx = adjustments.findIndex(
    (a) =>
      a.instituteId === input.instituteId &&
      (a.status === "pending" || a.status === "verification_pending") &&
      periodKey(a.periodStartAt, a.periodEndAt) ===
        periodKey(period.startAt, period.endAt),
  );

  if (!quote.chargeRequired) {
    if (openIdx >= 0 && adjustments[openIdx]!.status === "pending") {
      adjustments[openIdx] = {
        ...adjustments[openIdx]!,
        status: "cancelled",
        liveStudentCount: live,
        additionalStudentCount: quote.additionalStudentCount,
        additionalMonthlyInr: 0,
        payableAmountInr: 0,
        remainingMonths: quote.remainingMonths,
        updatedAt: nowIso(),
      };
    }
    writeState({
      ...upsertSubscription(state, nextSub),
      billingAdjustments: adjustments,
      renewals: renewalsFrozen,
    });
    return null;
  }

  // Do not overwrite a submission already awaiting Nexus verification.
  if (openIdx >= 0 && adjustments[openIdx]!.status === "verification_pending") {
    writeState({
      ...upsertSubscription(state, nextSub),
      renewals: renewalsFrozen,
    });
    return adjustments[openIdx]!;
  }

  const base: BillingAdjustment = {
    adjustmentId: openIdx >= 0 ? adjustments[openIdx]!.adjustmentId : newId("adj"),
    instituteId: nextSub.instituteId,
    instituteName: nextSub.instituteName,
    periodStartAt: period.startAt,
    periodEndAt: period.endAt,
    durationMonths: period.durationMonths,
    purchaseStudentCount: period.activeStudentCount,
    assignedRateInr: period.assignedRateInr,
    purchaseMonthlyPriceInr: period.monthlyPriceInr,
    liveStudentCount: live,
    additionalStudentCount: quote.additionalStudentCount,
    additionalMonthlyInr: quote.additionalMonthlyInr,
    remainingMonths: quote.remainingMonths,
    payableAmountInr: quote.payableAmountInr,
    reason:
      openIdx >= 0 && adjustments[openIdx]!.reason
        ? adjustments[openIdx]!.reason
        : DEFAULT_ADJUSTMENT_REASON,
    status: "pending",
    createdAt: openIdx >= 0 ? adjustments[openIdx]!.createdAt : nowIso(),
    updatedAt: nowIso(),
  };

  if (openIdx >= 0) adjustments[openIdx] = base;
  else adjustments.unshift(base);

  writeState({
    ...upsertSubscription(state, nextSub),
    billingAdjustments: adjustments,
    renewals: renewalsFrozen,
  });
  return base;
}

/** Admin: submit offline payment for a pending seat adjustment (no auto-activate). */
export function submitBillingAdjustmentOffline(input: {
  adjustmentId: string;
  referenceId: string;
  proofLabel?: string;
}): BillingAdjustment | null {
  const state = readState();
  const idx = (state.billingAdjustments ?? []).findIndex(
    (a) => a.adjustmentId === input.adjustmentId,
  );
  if (idx < 0) return null;
  const cur = state.billingAdjustments[idx]!;
  if (cur.status !== "pending") return cur.status === "verification_pending" ? cur : null;

  const updated: BillingAdjustment = {
    ...cur,
    status: "verification_pending",
    referenceId: input.referenceId.trim() || newId("REF"),
    proofLabel: input.proofLabel?.trim() || undefined,
    submittedAt: nowIso(),
    updatedAt: nowIso(),
  };

  const payment: PaymentRecord = {
    paymentId: newId("pay"),
    instituteId: cur.instituteId,
    method: "offline",
    status: "verification_pending",
    amountInr: cur.payableAmountInr,
    reference: updated.referenceId,
    note: `Seat adjustment · +${cur.additionalStudentCount} students`,
    createdAt: nowIso(),
  };

  const billingAdjustments = state.billingAdjustments.slice();
  billingAdjustments[idx] = updated;

  writeState({
    ...state,
    billingAdjustments,
    payments: [payment, ...state.payments],
  });
  return updated;
}

/** Nexus: approve seat-adjustment payment — marks paid; does not rewrite renewal snapshot. */
export function approveBillingAdjustment(
  adjustmentId: string,
  opts?: { reviewedBy?: string },
): BillingAdjustment | null {
  const state = readState();
  const idx = (state.billingAdjustments ?? []).findIndex(
    (a) => a.adjustmentId === adjustmentId,
  );
  if (idx < 0) return null;
  const cur = state.billingAdjustments[idx]!;
  if (cur.status !== "verification_pending") return null;

  const reviewedBy = opts?.reviewedBy ?? "Nexus Operator";
  const resolvedAt = nowIso();
  const renewalsFrozen = state.renewals.map((r) => ({ ...r }));

  const payIdx = state.payments.findIndex(
    (p) =>
      p.instituteId === cur.instituteId &&
      p.status === "verification_pending" &&
      p.reference === cur.referenceId,
  );

  const paymentId = payIdx >= 0 ? state.payments[payIdx]!.paymentId : newId("pay");
  const paidPayment: PaymentRecord = {
    paymentId,
    instituteId: cur.instituteId,
    method: "offline",
    status: "paid",
    amountInr: cur.payableAmountInr,
    reference: cur.referenceId,
    note: `Seat adjustment approved · +${cur.additionalStudentCount} students`,
    createdAt: payIdx >= 0 ? state.payments[payIdx]!.createdAt : cur.submittedAt ?? resolvedAt,
    resolvedAt,
    resolvedBy: reviewedBy,
  };

  const payments = state.payments.slice();
  if (payIdx >= 0) payments[payIdx] = paidPayment;
  else payments.unshift(paidPayment);

  const updated: BillingAdjustment = {
    ...cur,
    status: "paid",
    paymentId,
    reviewedAt: resolvedAt,
    reviewedBy,
    updatedAt: resolvedAt,
  };
  const billingAdjustments = state.billingAdjustments.slice();
  billingAdjustments[idx] = updated;

  // Live headcount already on subscription — do NOT mutate currentPeriod snapshot.
  writeState({
    ...state,
    billingAdjustments,
    payments,
    renewals: renewalsFrozen,
  });
  return updated;
}

/** Nexus: reject seat-adjustment payment — institute stays on existing subscription. */
export function rejectBillingAdjustment(
  adjustmentId: string,
  opts: { reason: string; reviewedBy?: string },
): BillingAdjustment | null {
  const state = readState();
  const idx = (state.billingAdjustments ?? []).findIndex(
    (a) => a.adjustmentId === adjustmentId,
  );
  if (idx < 0) return null;
  const cur = state.billingAdjustments[idx]!;
  if (cur.status !== "verification_pending") return null;

  const reviewedBy = opts.reviewedBy ?? "Nexus Operator";
  const resolvedAt = nowIso();
  const reason = opts.reason.trim() || "Adjustment payment rejected";
  const renewalsFrozen = state.renewals.map((r) => ({ ...r }));

  const updated: BillingAdjustment = {
    ...cur,
    status: "pending",
    rejectionReason: reason,
    reviewedAt: resolvedAt,
    reviewedBy,
    referenceId: undefined,
    proofLabel: undefined,
    submittedAt: undefined,
    updatedAt: resolvedAt,
  };

  const payIdx = state.payments.findIndex(
    (p) =>
      p.instituteId === cur.instituteId &&
      p.status === "verification_pending" &&
      p.reference === cur.referenceId,
  );
  const payments = state.payments.slice();
  if (payIdx >= 0) {
    payments[payIdx] = {
      ...payments[payIdx]!,
      status: "rejected",
      note: reason,
      resolvedAt,
      resolvedBy: reviewedBy,
    };
  }

  const billingAdjustments = state.billingAdjustments.slice();
  billingAdjustments[idx] = updated;

  writeState({
    ...state,
    billingAdjustments,
    payments,
    renewals: renewalsFrozen,
  });
  return updated;
}
