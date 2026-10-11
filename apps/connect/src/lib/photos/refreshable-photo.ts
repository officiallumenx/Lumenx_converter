/**
 * Resolve a display photo URL with one safe refresh on expiry / load failure.
 * Reuses signed-url-cache + in-flight dedupe from getPhotoSignedUrl.
 */

import {
  getPhotoSignedUrl,
  invalidateCachedPhotoSignedUrl,
} from "./api";

const MAX_REFRESH_ATTEMPTS = 1;

const refreshAttempts = new Map<string, number>();

function attemptKey(kind: string, id: string): string {
  return `${kind}:${id.trim()}`;
}

export function __resetPhotoRefreshAttemptsForTests(): void {
  refreshAttempts.clear();
}

/**
 * After an <img> error (or known stale URL), invalidate cache and fetch once.
 * Returns null when refresh is exhausted or yields no URL.
 */
export async function refreshPhotoSignedUrlOnFailure(
  kind: "student" | "teacher" | "driver",
  id: string,
): Promise<string | null> {
  const key = attemptKey(kind, id);
  const attempts = refreshAttempts.get(key) ?? 0;
  if (attempts >= MAX_REFRESH_ATTEMPTS) {
    return null;
  }
  refreshAttempts.set(key, attempts + 1);
  invalidateCachedPhotoSignedUrl(kind, id);
  try {
    const dto = await getPhotoSignedUrl(kind, id);
    return dto.photoSignedUrl?.trim() || null;
  } catch {
    return null;
  }
}

/** Reset attempt counter after a successful paint (optional). */
export function clearPhotoRefreshAttempts(
  kind: "student" | "teacher" | "driver",
  id: string,
): void {
  refreshAttempts.delete(attemptKey(kind, id));
}
