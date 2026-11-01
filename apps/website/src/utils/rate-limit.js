/** Simple in-memory IP rate limiter for Pages Functions / tests. */

const DEFAULT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_MAX = 8;

/**
 * @param {Map<string, { count: number, reset: number }>} store
 * @param {Request} request
 * @param {{ windowMs?: number, max?: number }} [opts]
 */
export function withinRateLimit(store, request, opts = {}) {
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const max = opts.max ?? DEFAULT_MAX;
  const ip = request.headers?.get?.("cf-connecting-ip")?.trim() || "unknown";
  const now = Date.now();
  if (store.size > 500) {
    for (const [key, row] of store) {
      if (row.reset < now) store.delete(key);
    }
  }
  const row = store.get(ip);
  if (!row || row.reset < now) {
    store.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  row.count += 1;
  return row.count <= max;
}
