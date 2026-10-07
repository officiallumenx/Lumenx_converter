/**
 * Runs as early as possible on boot so poisoned offline queues / sessions from
 * older builds cannot crash React before the login shell mounts.
 *
 * Must stay SSR/Worker-safe: bare `localStorage` is a ReferenceError in ESM
 * environments that do not define it (Cloudflare Workers). Always use
 * `globalThis.localStorage` behind try/catch — never `typeof localStorage`.
 */

/** Bump whenever a one-shot wipe must re-run for clients that already cleared. */
const CLEAR_FLAG = "lumenx.transport.client-reset.2026-10-07b";

const KEYS_TO_DROP = [
  "lumenx.transport.ops-outbox.v1",
  "lumenx.transport.ops-outbox.v2",
  "lumenx.transport.gps-outbox.v1",
  "lumenx.transport.trip.v1",
  "lumenx.transport.trip-attendance.v1",
  "lumenx.transport.route-setup.v1",
  "lumenx.transport.supabase.auth.v1",
  "ues_transport_session",
] as const;

const PRIOR_CLEAR_FLAGS = [
  "lumenx.transport.client-reset.2026-10-07",
] as const;

export function getTransportLocalStorage(): Storage | null {
  try {
    const storage = globalThis.localStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

function removeKey(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Drop known poison keys once per CLEAR_FLAG (boot path). */
export function clearStaleTransportClientState(): void {
  const storage = getTransportLocalStorage();
  if (!storage) return;
  try {
    if (storage.getItem(CLEAR_FLAG) === "1") return;
    for (const key of KEYS_TO_DROP) {
      removeKey(storage, key);
    }
    for (const flag of PRIOR_CLEAR_FLAGS) {
      removeKey(storage, flag);
    }
    storage.setItem(CLEAR_FLAG, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Full recovery wipe used by ErrorComponent — every lumenx.transport.* key,
 * Supabase auth session, and legacy transport session.
 */
export function clearTransportClientData(): void {
  const storage = getTransportLocalStorage();
  if (!storage) return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key) continue;
      if (
        key.startsWith("lumenx.transport.") ||
        key === "ues_transport_session" ||
        key === "lumenx-transport-theme"
      ) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      removeKey(storage, key);
    }
    // Ensure auth keys are gone even if length iteration raced.
    removeKey(storage, "lumenx.transport.supabase.auth.v1");
    removeKey(storage, "ues_transport_session");
    for (const flag of [...PRIOR_CLEAR_FLAGS, CLEAR_FLAG]) {
      removeKey(storage, flag);
    }
  } catch {
    /* ignore */
  }
}

clearStaleTransportClientState();
