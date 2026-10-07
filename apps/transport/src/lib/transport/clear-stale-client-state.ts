/**
 * Runs as early as possible on boot so poisoned offline queues from older
 * builds cannot flush Path-parameter 400s before React mounts.
 */
const CLEAR_FLAG = "lumenx.transport.client-reset.2026-10-07";

const KEYS_TO_DROP = [
  "lumenx.transport.ops-outbox.v1",
  "lumenx.transport.ops-outbox.v2",
  "lumenx.transport.gps-outbox.v1",
  "lumenx.transport.trip.v1",
  "lumenx.transport.trip-attendance.v1",
] as const;

export function clearStaleTransportClientState(): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (localStorage.getItem(CLEAR_FLAG) === "1") return;
    for (const key of KEYS_TO_DROP) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    localStorage.setItem(CLEAR_FLAG, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

clearStaleTransportClientState();
