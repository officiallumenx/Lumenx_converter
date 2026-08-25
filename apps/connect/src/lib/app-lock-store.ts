/**
 * App lock — 6-digit PIN persisted on device (separate from auth session).
 * Survives sign-out and turning app lock off/on; same PIN is reused when re-enabled.
 */
export const PIN_LENGTH = 6;
export const MAX_PIN_ATTEMPTS = 5;
export const APP_UNLOCK_SESSION_KEY = "lumenx.connect.appUnlock.session.v1";
const STORAGE_KEY = "lumenx.connect.appLock.v1";

type AppLockState = {
  enabled: boolean;
  pin: string | null;
};

type Listener = () => void;
const listeners = new Set<Listener>();

let snapshotCache: AppLockState = { enabled: false, pin: null };
let snapshotCacheKey = "";

function snapshotKey(state: AppLockState): string {
  return `${state.enabled}:${state.pin ?? ""}`;
}

function normalize(state: AppLockState): AppLockState {
  if (state.enabled && !state.pin) return { enabled: false, pin: state.pin };
  return state;
}

function read(): AppLockState {
  if (typeof window === "undefined") return { enabled: false, pin: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const rawKey = raw ?? "";
    if (rawKey === snapshotCacheKey) return snapshotCache;

    if (!raw) {
      snapshotCacheKey = "";
      snapshotCache = { enabled: false, pin: null };
      return snapshotCache;
    }

    const parsed = JSON.parse(raw) as AppLockState;
    const state = normalize({
      enabled: Boolean(parsed.enabled),
      pin: typeof parsed.pin === "string" && /^\d{6}$/.test(parsed.pin) ? parsed.pin : null,
    });
    // Heal corrupted lock flags so the app is never stuck behind a broken PIN gate.
    if (state.enabled !== Boolean(parsed.enabled)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    snapshotCacheKey = snapshotKey(state);
    snapshotCache = state;
    return snapshotCache;
  } catch {
    snapshotCacheKey = "";
    snapshotCache = { enabled: false, pin: null };
    return snapshotCache;
  }
}

function write(state: AppLockState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Persist failed — keep in-memory snapshot so the session remains usable.
  }
  snapshotCacheKey = snapshotKey(state);
  snapshotCache = state;
  listeners.forEach((l) => l());
}

function notify() {
  listeners.forEach((l) => l());
}

export const appLockStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getState: read,
  isEnabled: () => {
    const { enabled, pin } = read();
    return enabled && Boolean(pin);
  },
  hasPin: () => Boolean(read().pin),
  enableWithPin(pin: string) {
    if (!/^\d{6}$/.test(pin)) throw new Error("PIN must be 6 digits");
    write({ enabled: true, pin });
    // Keep the current session unlocked so Settings stays usable after enabling.
    appLockStore.setUnlocked(true);
  },
  enableWithExistingPin() {
    const { pin } = read();
    if (!pin) throw new Error("No saved PIN");
    write({ enabled: true, pin });
    appLockStore.setUnlocked(true);
  },
  disable() {
    const { pin } = read();
    write({ enabled: false, pin });
  },
  updatePin(pin: string) {
    if (!/^\d{6}$/.test(pin)) throw new Error("PIN must be 6 digits");
    const { enabled } = read();
    write({ enabled, pin });
    appLockStore.setUnlocked(true);
  },
  verifyPin(pin: string) {
    return read().pin === pin;
  },
  async verifyPinAsync(pin: string): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 280));
    return read().pin === pin;
  },
  isUnlocked(): boolean {
    const { enabled, pin } = read();
    if (!enabled || !pin) return true;
    try {
      return sessionStorage.getItem(APP_UNLOCK_SESSION_KEY) === "1";
    } catch {
      return false;
    }
  },
  setUnlocked(unlocked = true) {
    try {
      if (unlocked) sessionStorage.setItem(APP_UNLOCK_SESSION_KEY, "1");
      else sessionStorage.removeItem(APP_UNLOCK_SESSION_KEY);
    } catch {
      // ignore
    }
    notify();
  },
  lockSession() {
    appLockStore.setUnlocked(false);
  },
};
