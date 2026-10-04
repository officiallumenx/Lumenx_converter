/**
 * Notification / push deep links must stay in-app (relative paths only).
 * Rejects absolute URLs, protocol-relative URLs, and dangerous schemes.
 */

const RELATIVE_APP_PATH = /^\/(?!\/)[A-Za-z0-9\-._~!$&'()*+,;=:@/%?#[\]]*$/;

export function isSafeAppDeepLink(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return false;
  if (trimmed.includes("\\") || trimmed.includes("\0")) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("http:") ||
    lower.startsWith("https:") ||
    lower.startsWith("//") ||
    lower.startsWith("javascript:") ||
    lower.startsWith("data:")
  ) {
    return false;
  }
  return RELATIVE_APP_PATH.test(trimmed);
}

/** Normalize for emit/open; returns null when empty or unsafe. */
export function normalizeSafeAppDeepLink(
  value: string | null | undefined,
  fallback: string | null = null,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return fallback;
  if (!isSafeAppDeepLink(trimmed)) return fallback;
  return trimmed;
}

/**
 * Open a push/notification href safely in the browser.
 * Only relative in-app paths are followed; absolute URLs are ignored.
 */
export function openSafeAppDeepLink(
  href: string | null | undefined,
  navigate?: (path: string) => void,
): boolean {
  const safe = normalizeSafeAppDeepLink(href);
  if (!safe) return false;
  if (navigate) {
    navigate(safe);
    return true;
  }
  if (typeof window === "undefined") return false;
  window.location.assign(safe);
  return true;
}
