/**
 * Profile photo signed URLs expire (~1h). Treat them as stale before expiry
 * so reopen paints from cache only while the URL is still valid.
 */

const EXPIRY_SKEW_MS = 5 * 60_000;

export function photoUrlExpiryMs(expiresAt: string | null | undefined): number | null {
  if (!expiresAt?.trim()) return null;
  const ms = Date.parse(expiresAt);
  return Number.isFinite(ms) ? ms : null;
}

/** True when a signed URL should still load in <img>. */
export function isSignedPhotoUrlUsable(
  url: string | null | undefined,
  expiresAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!url?.trim()) return false;
  const exp = photoUrlExpiryMs(expiresAt);
  if (exp == null) return true;
  return exp - EXPIRY_SKEW_MS > now;
}

/**
 * staleTime so TanStack Query refetches before storage signatures die.
 * Returns 0 when already expired (or about to).
 */
export function signedPhotoStaleTimeMs(
  expiresAt: string | null | undefined,
  now = Date.now(),
  maxStaleMs = 25 * 60_000,
): number {
  const exp = photoUrlExpiryMs(expiresAt);
  if (exp == null) return maxStaleMs;
  return Math.max(0, Math.min(maxStaleMs, exp - EXPIRY_SKEW_MS - now));
}

/** Earliest usable staleTime across a photo list payload. */
export function photoListStaleTimeMs(
  rows: Array<{ photoExpiresAt?: string | null }> | null | undefined,
  now = Date.now(),
  maxStaleMs = 20 * 60_000,
): number {
  if (!rows?.length) return maxStaleMs;
  let min = maxStaleMs;
  let sawExpiry = false;
  for (const row of rows) {
    if (!row.photoExpiresAt) continue;
    sawExpiry = true;
    min = Math.min(min, signedPhotoStaleTimeMs(row.photoExpiresAt, now, maxStaleMs));
  }
  return sawExpiry ? min : maxStaleMs;
}
