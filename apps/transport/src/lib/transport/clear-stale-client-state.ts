/**
 * Runs as early as possible on boot so poisoned offline queues from older
 * builds cannot flush Path-parameter 400s before React mounts.
 *
 * Must stay SSR/Worker-safe: bare `localStorage` is a ReferenceError in ESM
 * environments that do not define it (Cloudflare Workers).
 */
const CLEAR_FLAG = "lumenx.transport.client-reset.2026-10-07";

const KEYS_TO_DROP = [
  "lumenx.transport.ops-outbox.v1",
  "lumenx.transport.ops-outbox.v2",
  "lumenx.transport.gps-outbox.v1",
  "lumenx.transport.trip.v1",
  "lumenx.transport.trip-attendance.v1",
] as const;

function getLocalStorage(): Storage | null {
  try {
    const storage = globalThis.localStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

export function clearStaleTransportClientState(): void {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    if (storage.getItem(CLEAR_FLAG) === "1") return;
    for (const key of KEYS_TO_DROP) {
      try {
        storage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    storage.setItem(CLEAR_FLAG, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

clearStaleTransportClientState();
