/**
 * Online payment adapter — provider-agnostic interface for future gateways.
 *
 * Phase 7: ComingSoonOnlinePaymentAdapter only.
 * Do NOT wire Razorpay / Stripe / any real provider here yet.
 * Do NOT return fake success or activate subscriptions from online checkout.
 *
 * Offline payment (submitOfflinePayment → Nexus approve) remains the only
 * working payment path that can reach ACTIVE.
 */

import type { SubscriptionDurationMonths } from "./policy";

/** Input for starting an online checkout session. */
export type OnlineCheckoutRequest = {
  instituteId: string;
  instituteName?: string;
  durationMonths: SubscriptionDurationMonths;
  /** Final payable from subscription quote (INR). */
  payableAmountInr: number;
  currency: "INR";
  /** Optional idempotency / client reference. */
  clientReference?: string;
};

/**
 * Result of beginCheckout / confirmCheckout.
 * Success shape is reserved for a real provider later — Coming Soon never returns ok: true.
 */
export type OnlineCheckoutFailure = {
  ok: false;
  reason: "coming_soon" | "provider_unavailable" | "cancelled" | "failed" | "invalid_request";
  message: string;
  /** Always false for non-activating adapters (Coming Soon). */
  activatesSubscription: false;
};

export type OnlineCheckoutSuccess = {
  ok: true;
  providerId: string;
  /** Gateway session / order id — used by a future confirm / webhook handler. */
  providerSessionId: string;
  /** Hosted checkout URL when the provider redirects the browser. */
  checkoutUrl?: string;
  /**
   * Real providers still must NOT activate until webhook/confirm succeeds.
   * Activation is always a separate domain step (never from a UI button alone).
   */
  activatesSubscription: false;
};

export type OnlineCheckoutResult = OnlineCheckoutFailure | OnlineCheckoutSuccess;

/**
 * Pluggable online payment provider.
 * Implement this to add Razorpay, Stripe, etc. later — register via setOnlinePaymentAdapter.
 */
export interface OnlinePaymentAdapter {
  readonly id: string;
  readonly displayName: string;
  /** False until a real provider is configured and enabled. */
  readonly isAvailable: boolean;
  /** Short Admin-facing status line (e.g. "Online payments are coming soon."). */
  readonly statusMessage: string;
  beginCheckout(
    request: OnlineCheckoutRequest,
  ): OnlineCheckoutResult | Promise<OnlineCheckoutResult>;
  /**
   * Optional: confirm return-URL / webhook payload.
   * Coming Soon does not implement activation here.
   */
  confirmCheckout?(
    providerSessionId: string,
  ): OnlineCheckoutResult | Promise<OnlineCheckoutResult>;
}

const COMING_SOON_MESSAGE = "Online payments are coming soon.";

/**
 * Default adapter — no gateway, no fake success, never activates subscription.
 */
export const ComingSoonOnlinePaymentAdapter: OnlinePaymentAdapter = {
  id: "coming_soon",
  displayName: "Pay Online",
  isAvailable: false,
  statusMessage: COMING_SOON_MESSAGE,
  beginCheckout(_request: OnlineCheckoutRequest): OnlineCheckoutFailure {
    void _request;
    return {
      ok: false,
      reason: "coming_soon",
      message: COMING_SOON_MESSAGE,
      activatesSubscription: false,
    };
  },
  confirmCheckout(_providerSessionId: string): OnlineCheckoutFailure {
    void _providerSessionId;
    return {
      ok: false,
      reason: "coming_soon",
      message: COMING_SOON_MESSAGE,
      activatesSubscription: false,
    };
  },
};

let activeAdapter: OnlinePaymentAdapter = ComingSoonOnlinePaymentAdapter;

/** Current online payment adapter (Coming Soon until a real provider is registered). */
export function getOnlinePaymentAdapter(): OnlinePaymentAdapter {
  return activeAdapter;
}

/**
 * Swap in a real provider later (Razorpay, Stripe, …).
 * Callers must still activate subscription only after verified webhook / server confirm —
 * never from a client-only “success” click.
 */
export function setOnlinePaymentAdapter(adapter: OnlinePaymentAdapter): void {
  activeAdapter = adapter;
}

/** Reset to Coming Soon (tests / teardown). */
export function resetOnlinePaymentAdapter(): void {
  activeAdapter = ComingSoonOnlinePaymentAdapter;
}

/**
 * Start online checkout through the registered adapter.
 * Guarantees activatesSubscription === false for the Coming Soon path.
 * Does not mutate subscription lifecycle to ACTIVE.
 */
export function beginOnlineCheckout(
  request: OnlineCheckoutRequest,
): OnlineCheckoutResult | Promise<OnlineCheckoutResult> {
  const adapter = getOnlinePaymentAdapter();
  return adapter.beginCheckout(request);
}

export function isOnlinePaymentAvailable(): boolean {
  return getOnlinePaymentAdapter().isAvailable;
}

export function getOnlinePaymentStatusMessage(): string {
  return getOnlinePaymentAdapter().statusMessage;
}
