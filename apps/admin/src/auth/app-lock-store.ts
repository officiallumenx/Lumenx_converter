/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — App Lock Store
 *  Session unlock state + per-user security PIN (mock).
 *  Replace with secure enclave / API in production.
 * ───────────────────────────────────────────────────────────── */

import { DEMO_USERS } from "./constants";
import { notifyAccountSecurityChange, notifySecurityEvent } from "@lumenx/module-notifications";
import { isAppLockRequired, isLocalPinStorageAllowed } from "./app-lock-policy";

export const APP_UNLOCK_SESSION_KEY = "lx_app_unlocked_session_v1";
export const USER_PINS_STORAGE_KEY  = "lx_user_security_pins_v1";

/** Default demo PIN for all demo accounts */
export const DEMO_SECURITY_PIN = "123456";

export const PIN_LENGTH = 6;
export const MAX_PIN_ATTEMPTS = 5;

type UserPinMap = Record<string, string>;

function loadPins(): UserPinMap {
  try {
    const raw = localStorage.getItem(USER_PINS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserPinMap) : {};
  } catch {
    return {};
  }
}

function writePins(pins: UserPinMap): void {
  try {
    localStorage.setItem(USER_PINS_STORAGE_KEY, JSON.stringify(pins));
  } catch {
    // storage unavailable
  }
}

/** Seed demo user PINs on first run (demo mode only). */
export function ensureDemoPinsSeeded(): void {
  if (!isLocalPinStorageAllowed()) return;
  const pins = loadPins();
  let changed = false;
  for (const demo of DEMO_USERS) {
    if (!pins[demo.user.id]) {
      pins[demo.user.id] = DEMO_SECURITY_PIN;
      changed = true;
    }
  }
  if (changed) writePins(pins);
}

export function saveUserPin(userId: string, pin: string, email?: string): void {
  if (!isLocalPinStorageAllowed()) return;
  const pins = loadPins();
  const hadPin = Boolean(pins[userId]);
  pins[userId] = pin;
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail) {
    pins[`email:${normalizedEmail}`] = pin;
  }
  writePins(pins);
  try {
    notifyAccountSecurityChange({
      id: `pin-change-${userId}-${Date.now()}`,
      message: hadPin
        ? "Your app-lock PIN was updated."
        : "An app-lock PIN was set for your account.",
    });
    notifySecurityEvent({
      id: `pin-sec-${userId}-${Date.now()}`,
      message: `Security PIN changed for user ${userId}.`,
    });
  } catch {
    // Notifications must never block auth / PIN unlock.
  }
}

export function getUserSecurityPin(userId: string, email?: string): string | null {
  if (!isLocalPinStorageAllowed()) return null;
  ensureDemoPinsSeeded();
  const pins = loadPins();
  if (pins[userId]) return pins[userId] ?? null;
  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail) {
    return pins[`email:${normalizedEmail}`] ?? null;
  }
  return null;
}

export function verifyUserPin(userId: string, pin: string, email?: string): boolean {
  if (!isAppLockRequired()) {
    // API mode: local PIN must never verify identity or unlock the app.
    return false;
  }
  ensureDemoPinsSeeded();
  const stored = getUserSecurityPin(userId, email);
  if (!stored) return pin === DEMO_SECURITY_PIN;
  return stored === pin;
}

// ── Session unlock (cleared on tab close / new app launch) ───

type UnlockListener = () => void;
const unlockListeners = new Set<UnlockListener>();

/** In-memory fallback when sessionStorage is blocked (private mode / quota). */
let unlockMemory = false;

function notifyUnlockListeners() {
  unlockListeners.forEach((l) => l());
}

export function subscribeAppUnlock(listener: UnlockListener): () => void {
  unlockListeners.add(listener);
  return () => {
    unlockListeners.delete(listener);
  };
}

export function isAppUnlocked(): boolean {
  try {
    if (sessionStorage.getItem(APP_UNLOCK_SESSION_KEY) === "1") {
      unlockMemory = true;
      return true;
    }
  } catch {
    // fall through to memory
  }
  return unlockMemory;
}

export function setAppUnlocked(unlocked = true): void {
  unlockMemory = unlocked;
  try {
    if (unlocked) sessionStorage.setItem(APP_UNLOCK_SESSION_KEY, "1");
    else sessionStorage.removeItem(APP_UNLOCK_SESSION_KEY);
  } catch {
    // memory flag still drives unlock for this tab
  }
  notifyUnlockListeners();
}

export function clearAppUnlock(): void {
  setAppUnlocked(false);
}

/** Mock async verify — ready for API swap. */
export async function mockVerifyAppPin(
  userId: string,
  pin: string,
  email?: string,
): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 320));
  return verifyUserPin(userId, pin, email);
}
