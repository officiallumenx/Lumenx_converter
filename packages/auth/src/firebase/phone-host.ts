/**
 * Firebase Phone Auth host policy.
 *
 * Firebase rejects Phone Auth / reCAPTCHA on hostname `localhost` with
 * `auth/invalid-app-credential`. Loopback IPv4 `127.0.0.1` is supported when
 * listed under Authentication → Settings → Authorized domains.
 */

import { FirebaseClientAuthError } from "./errors";

const BLOCKED_HOSTS = new Set(["localhost", "[::1]"]);

export function isFirebasePhoneAuthBlockedHost(
  hostname: string | null | undefined = typeof window !== "undefined"
    ? window.location.hostname
    : null,
): boolean {
  if (!hostname) return false;
  return BLOCKED_HOSTS.has(hostname.trim().toLowerCase());
}

/** Build the same URL on 127.0.0.1 (path, query, hash, port preserved). */
export function toFirebasePhoneAuthLoopbackUrl(
  href: string = typeof window !== "undefined" ? window.location.href : "http://127.0.0.1/",
): string {
  const url = new URL(href);
  url.hostname = "127.0.0.1";
  return url.toString();
}

/**
 * If the page is on a blocked host, replace location with 127.0.0.1 and return true.
 * Safe to call on every app boot and before any phone OTP request.
 */
export function ensureFirebasePhoneAuthHost(): boolean {
  if (typeof window === "undefined") return false;
  if (!isFirebasePhoneAuthBlockedHost(window.location.hostname)) return false;
  window.location.replace(toFirebasePhoneAuthLoopbackUrl(window.location.href));
  return true;
}

/**
 * Call immediately before Firebase phone OTP. Redirects when needed, then throws
 * so the current attempt does not continue into a doomed reCAPTCHA call.
 */
export function assertFirebasePhoneAuthHostAllowed(): void {
  if (typeof window === "undefined") return;
  if (!isFirebasePhoneAuthBlockedHost(window.location.hostname)) return;

  ensureFirebasePhoneAuthHost();
  throw new FirebaseClientAuthError(
    "recaptcha",
    "Firebase phone SMS cannot run on localhost. Use http://127.0.0.1 (same port) and add 127.0.0.1 under Firebase Authentication → Settings → Authorized domains.",
    "auth/invalid-app-credential",
  );
}
