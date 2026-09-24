/** Bump when persisted query shapes become incompatible (discards old IndexedDB cache). */
export const ADMIN_QUERY_CACHE_BUSTER = 1;

/** Persist dehydrated queries for up to 7 days. */
export const ADMIN_QUERY_PERSIST_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Default list / module stale window — aligned with persist maxAge so reopen
 * paints from disk instead of treating restored data as immediately stale.
 */
export const ADMIN_QUERY_STALE_TIME_MS = ADMIN_QUERY_PERSIST_MAX_AGE_MS;

/** Catalog / reference data — same cache-first window as lists. */
export const ADMIN_QUERY_CATALOG_STALE_TIME_MS = ADMIN_QUERY_PERSIST_MAX_AGE_MS;

/** Notifications / volatile inbox — stay short so unread stays fresh. */
export const ADMIN_QUERY_VOLATILE_STALE_TIME_MS = 45_000;

/**
 * Keep unused queries in memory at least as long as persistence maxAge
 * so GC does not fight disk restore.
 */
export const ADMIN_QUERY_GC_TIME_MS = ADMIN_QUERY_PERSIST_MAX_AGE_MS;

export const ADMIN_QUERY_SCOPE = "admin" as const;
