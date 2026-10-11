/**
 * In-memory TTL cache for profile photo signed URLs.
 * Avoids repeated /api/v1/photos/signed-url calls on remount / list re-render.
 * Never persisted to disk — signed URLs are short-lived secrets.
 */

export type CachedPhotoSignedUrl = {
  photoAssetPath: string | null;
  photoSignedUrl: string | null;
  photoExpiresAt: string | null;
};

type CacheEntry = CachedPhotoSignedUrl & {
  fetchedAt: number;
};

const store = new Map<string, CacheEntry>();

/** Refresh before expiry — leave 60s margin. */
const EXPIRY_MARGIN_MS = 60_000;
/** Cap cache lifetime even when server omits expiresAt (typical signed URL ~1h). */
const DEFAULT_TTL_MS = 45 * 60_000;

function cacheKey(kind: string, id: string): string {
  return `${kind}:${id.trim()}`;
}

function isEntryFresh(entry: CacheEntry, now = Date.now()): boolean {
  if (entry.photoExpiresAt) {
    const exp = Date.parse(entry.photoExpiresAt);
    if (Number.isFinite(exp)) {
      return now < exp - EXPIRY_MARGIN_MS;
    }
  }
  return now - entry.fetchedAt < DEFAULT_TTL_MS;
}

export function getCachedPhotoSignedUrl(
  kind: "student" | "teacher" | "driver",
  id: string,
): CachedPhotoSignedUrl | null {
  const key = cacheKey(kind, id);
  const entry = store.get(key);
  if (!entry) return null;
  if (!isEntryFresh(entry)) {
    store.delete(key);
    return null;
  }
  return {
    photoAssetPath: entry.photoAssetPath,
    photoSignedUrl: entry.photoSignedUrl,
    photoExpiresAt: entry.photoExpiresAt,
  };
}

export function setCachedPhotoSignedUrl(
  kind: "student" | "teacher" | "driver",
  id: string,
  value: CachedPhotoSignedUrl,
): void {
  store.set(cacheKey(kind, id), {
    ...value,
    fetchedAt: Date.now(),
  });
}

export function invalidateCachedPhotoSignedUrl(
  kind: "student" | "teacher" | "driver",
  id: string,
): void {
  store.delete(cacheKey(kind, id));
}

export function clearPhotoSignedUrlCache(): void {
  store.clear();
}

/** Test helper — current entry count. */
export function __photoSignedUrlCacheSizeForTests(): number {
  return store.size;
}
