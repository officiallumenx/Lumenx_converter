/**
 * Cross-app session-safety helpers for Supabase-backed API clients.
 * No tokens or PII are logged or returned.
 */

export type SessionRefreshKind =
  | "refreshed"
  | "invalid"
  | "transient"
  | "unavailable"
  | "unknown";

export type SessionRefreshOutcome = { kind: SessionRefreshKind };

/** Monotonic clock so late 401s cannot clear a newer login/logout. */
export type AuthSessionClock = {
  current: () => number;
  bump: () => number;
  resetForTests: () => void;
};

export function createAuthSessionClock(): AuthSessionClock {
  let generation = 0;
  return {
    current: () => generation,
    bump: () => {
      generation += 1;
      return generation;
    },
    resetForTests: () => {
      generation = 0;
    },
  };
}

const INVALID_REFRESH_CODES = new Set([
  "refresh_token_not_found",
  "refresh_token_already_used",
  "session_not_found",
  "session_expired",
  "user_banned",
  "invalid_grant",
  "bad_jwt",
  "user_not_found",
]);

/**
 * Classify a Supabase `refreshSession` failure without treating every failure
 * as a dead refresh token.
 */
export function classifySupabaseRefreshFailure(
  error: unknown,
): "invalid" | "transient" | "unknown" {
  if (error == null) return "unknown";

  if (typeof error === "string") {
    return classifyRefreshMessage(error);
  }

  if (typeof error !== "object") return "unknown";

  const e = error as {
    name?: unknown;
    status?: unknown;
    code?: unknown;
    message?: unknown;
  };

  if (e.name === "AuthRetryableFetchError") return "transient";
  if (e.name === "AbortError" || e.name === "TimeoutError") return "transient";

  if (typeof e.status === "number") {
    if (e.status === 0 || e.status === 408 || e.status === 429 || e.status >= 500) {
      return "transient";
    }
  }

  if (typeof e.code === "string" && INVALID_REFRESH_CODES.has(e.code.toLowerCase())) {
    return "invalid";
  }

  if (typeof e.message === "string") {
    const fromMessage = classifyRefreshMessage(e.message);
    if (fromMessage !== "unknown") return fromMessage;
  }

  return "unknown";
}

function classifyRefreshMessage(message: string): "invalid" | "transient" | "unknown" {
  const msg = message.toLowerCase();
  if (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("offline") ||
    msg.includes("econnreset") ||
    msg.includes("enotfound") ||
    msg.includes("load failed")
  ) {
    return "transient";
  }
  if (
    msg.includes("invalid refresh token") ||
    msg.includes("refresh token not found") ||
    msg.includes("refresh token has been revoked") ||
    msg.includes("session not found") ||
    msg.includes("session expired") ||
    msg.includes("user banned")
  ) {
    return "invalid";
  }
  return "unknown";
}

/** Normalize boolean legacy refresh results and structured outcomes. */
export function asSessionRefreshOutcome(
  result: boolean | SessionRefreshOutcome,
): SessionRefreshOutcome {
  if (typeof result === "boolean") {
    return { kind: result ? "refreshed" : "invalid" };
  }
  return result;
}

export function isSessionRefreshSuccess(
  result: boolean | SessionRefreshOutcome,
): boolean {
  return asSessionRefreshOutcome(result).kind === "refreshed";
}

/** True when the failure should clear an authenticated UI session. */
export function shouldClearSessionOnRefreshFailure(
  result: boolean | SessionRefreshOutcome,
): boolean {
  const kind = asSessionRefreshOutcome(result).kind;
  // No refresh token / confirmed dead grant — UI must not stay "signed in".
  return kind === "invalid" || kind === "unavailable";
}

/** True when the session may still be recoverable (keep UI signed in). */
export function isRecoverableRefreshFailure(
  result: boolean | SessionRefreshOutcome,
): boolean {
  const kind = asSessionRefreshOutcome(result).kind;
  return kind === "transient" || kind === "unknown";
}
