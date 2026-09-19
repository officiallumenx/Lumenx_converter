/**
 * Nexus app lock — local 4–8 digit PIN on this device.
 * No login/session auth; unlock lives in sessionStorage for the browser tab.
 */

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 8;
export const MAX_PIN_ATTEMPTS = 5;
export const APP_UNLOCK_SESSION_KEY = "lumenx.nexus.appUnlock.session.v1";
const STORAGE_KEY = "lumenx.nexus.appLock.v1";

const PIN_RE = new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`);

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

function isValidPin(pin: string): boolean {
  return PIN_RE.test(pin);
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
    const pin =
      typeof parsed.pin === "string" && isValidPin(parsed.pin) ? parsed.pin : null;
    const state = normalize({
      enabled: Boolean(parsed.enabled),
      pin,
    });
    if (state.enabled !== Boolean(parsed.enabled) || state.pin !== parsed.pin) {
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
    // Persist failed — keep in-memory snapshot.
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
  /** Length of the saved PIN (0 when none). Used by unlock UI dots. */
  getPinLength: () => read().pin?.length ?? 0,
  isValidPin,
  enableWithPin(pin: string) {
    if (!isValidPin(pin)) {
      throw new Error(`PIN must be ${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} digits`);
    }
    write({ enabled: true, pin });
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
    if (!isValidPin(pin)) {
      throw new Error(`PIN must be ${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} digits`);
    }
    const { enabled } = read();
    write({ enabled, pin });
    appLockStore.setUnlocked(true);
  },
  clearPin() {
    write({ enabled: false, pin: null });
    appLockStore.setUnlocked(true);
  },
  verifyPin(pin: string) {
    return read().pin === pin;
  },
  async verifyPinAsync(pin: string): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 220));
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
