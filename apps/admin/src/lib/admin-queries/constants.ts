/** Bump when persisted query shapes become incompatible (discards old IndexedDB cache). */
export const ADMIN_QUERY_CACHE_BUSTER = 1;

/** Persist dehydrated queries for up to 7 days. */
export const ADMIN_QUERY_PERSIST_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Default list / module stale window. */
export const ADMIN_QUERY_STALE_TIME_MS = 3 * 60_000;

/** Catalog / reference data stays fresher longer. */
export const ADMIN_QUERY_CATALOG_STALE_TIME_MS = 5 * 60_000;

/** Notifications / volatile inbox. */
export const ADMIN_QUERY_VOLATILE_STALE_TIME_MS = 45_000;

/**
 * Keep unused queries in memory at least as long as persistence maxAge
 * so GC does not fight disk restore.
 */
export const ADMIN_QUERY_GC_TIME_MS = ADMIN_QUERY_PERSIST_MAX_AGE_MS;

export const ADMIN_QUERY_SCOPE = "admin" as const;
