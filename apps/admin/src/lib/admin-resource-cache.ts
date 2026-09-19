/**
 * Short-lived in-memory cache so Admin modules reuse list data across navigations
 * instead of flashing "Loading…" and re-hitting the network every time.
 */

type CacheEntry = {
  value: unknown;
  at: number;
  /** Bumped for each new in-flight fetch; stale completions must not write. */
  generation: number;
  /** In-flight promise for request coalescing (same key). */
  inflight?: Promise<unknown>;
  /** Generation that owns `inflight`. */
  inflightGeneration?: number;
};

const store = new Map<string, CacheEntry>();

/** Fresh enough to show immediately without a loading flash. */
export const ADMIN_CACHE_TTL_MS = 90_000;

/** Soft-stale window: return cached value but allow background refresh. */
export const ADMIN_CACHE_SOFT_TTL_MS = 5 * 60_000;

export function adminCacheKey(
  resource: string,
  instituteId: string,
  extra: string = "",
): string {
  return extra
    ? `admin:${resource}:${instituteId}:${extra}`
    : `admin:${resource}:${instituteId}`;
}

export function peekAdminCache<T>(key: string, ttlMs = ADMIN_CACHE_TTL_MS): T | null {
  const entry = store.get(key);
  if (!entry || entry.value === undefined) return null;
  if (Date.now() - entry.at > ttlMs) return null;
  return entry.value as T;
}

/** Return cached value even if soft-stale (for instant paint + background refresh). */
export function peekAdminCacheSoft<T>(
  key: string,
  softTtlMs = ADMIN_CACHE_SOFT_TTL_MS,
): T | null {
  const entry = store.get(key);
  if (!entry || entry.value === undefined) return null;
  if (Date.now() - entry.at > softTtlMs) return null;
  return entry.value as T;
}

export function isAdminCacheFresh(key: string, ttlMs = ADMIN_CACHE_TTL_MS): boolean {
  const entry = store.get(key);
  if (!entry || entry.value === undefined) return false;
  return Date.now() - entry.at <= ttlMs;
}

export function setAdminCache<T>(key: string, value: T): void {
  const prev = store.get(key);
  store.set(key, {
    value,
    at: Date.now(),
    generation: prev?.generation ?? 0,
    inflight: prev?.inflight,
    inflightGeneration: prev?.inflightGeneration,
  });
}

export function invalidateAdminCache(prefixOrKey: string): void {
  if (store.has(prefixOrKey)) {
    store.delete(prefixOrKey);
  }
  const prefix = prefixOrKey.endsWith(":") ? prefixOrKey : `${prefixOrKey}`;
  for (const key of [...store.keys()]) {
    if (key === prefixOrKey || key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

export function invalidateAdminInstituteCache(instituteId: string): void {
  const needle = `:${instituteId}`;
  for (const key of [...store.keys()]) {
    if (key.includes(needle) || key.endsWith(instituteId)) {
      store.delete(key);
    }
  }
}

/**
 * Deduped fetch with TTL: fresh cache returns immediately;
 * soft-stale returns cache while a single network refresh runs;
 * miss waits on network.
 * `force` skips TTL and does not join a stale in-flight request.
 */
export async function cachedAdminFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { force?: boolean; ttlMs?: number; softTtlMs?: number },
): Promise<T> {
  const ttlMs = opts?.ttlMs ?? ADMIN_CACHE_TTL_MS;
  const softTtlMs = opts?.softTtlMs ?? ADMIN_CACHE_SOFT_TTL_MS;
  const force = opts?.force === true;

  if (!force) {
    const fresh = peekAdminCache<T>(key, ttlMs);
    if (fresh !== null) return fresh;
  }

  const existing = store.get(key);
  if (!force && existing?.inflight) {
    return existing.inflight as Promise<T>;
  }

  const soft = !force ? peekAdminCacheSoft<T>(key, softTtlMs) : null;
  const generation = (existing?.generation ?? 0) + 1;

  const inflight = fetcher()
    .then((value) => {
      const entry = store.get(key);
      if (!entry || entry.inflightGeneration !== generation) {
        return value;
      }
      store.set(key, {
        value,
        at: Date.now(),
        generation: entry.generation,
        inflight: undefined,
        inflightGeneration: undefined,
      });
      return value;
    })
    .catch((err) => {
      const entry = store.get(key);
      if (entry && entry.inflightGeneration === generation) {
        entry.inflight = undefined;
        entry.inflightGeneration = undefined;
      }
      throw err;
    });

  store.set(key, {
    value: force ? undefined : existing?.value,
    at: force ? 0 : (existing?.at ?? 0),
    generation,
    inflight,
    inflightGeneration: generation,
  });

  if (soft !== null) {
    void inflight.catch(() => undefined);
    return soft;
  }

  return inflight;
}
