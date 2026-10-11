/**
 * Recognize server subscription write-gate errors across Admin / Connect / Transport.
 * Backend details.reason is authoritative; message is a fallback.
 */

export type SubscriptionWriteGateReason =
  | "SUBSCRIPTION_READ_ONLY"
  | "SUBSCRIPTION_REQUIRED";

export function subscriptionWriteGateReasonFromDetails(
  details: unknown,
): SubscriptionWriteGateReason | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  const reason = (details as { reason?: unknown }).reason;
  if (reason === "SUBSCRIPTION_READ_ONLY" || reason === "SUBSCRIPTION_REQUIRED") {
    return reason;
  }
  return null;
}

/** True when an API client error is a subscription write lock (403 FORBIDDEN). */
export function isSubscriptionWriteBlockedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: unknown }).status;
  const details = (err as { details?: unknown }).details;
  if (subscriptionWriteGateReasonFromDetails(details)) return true;
  if (status === 403) {
    const message = String((err as { message?: unknown }).message ?? "");
    if (/subscription is read-only|subscription is required/i.test(message)) {
      return true;
    }
  }
  return false;
}

/** User-facing copy for subscription write locks (prefer server message). */
export function formatSubscriptionWriteBlockedMessage(
  err: unknown,
  fallback = "Subscription is read-only. Renew billing to restore edits.",
): string {
  if (err && typeof err === "object") {
    const message = String((err as { message?: unknown }).message ?? "").trim();
    if (message) return message;
    const reason = subscriptionWriteGateReasonFromDetails(
      (err as { details?: unknown }).details,
    );
    if (reason === "SUBSCRIPTION_REQUIRED") {
      return "Institute subscription is required before making changes.";
    }
  }
  return fallback;
}
