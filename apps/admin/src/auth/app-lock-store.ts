/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — App Lock Store
 *  Session unlock state + per-user security PIN (mock).
 *  Replace with secure enclave / API in production.
 * ───────────────────────────────────────────────────────────── */

import { DEMO_USERS } from "./constants";

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

/** Seed demo user PINs on first run. */
export function ensureDemoPinsSeeded(): void {
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

export function saveUserPin(userId: string, pin: string): void {
  const pins = loadPins();
  pins[userId] = pin;
  writePins(pins);
}

export function getUserSecurityPin(userId: string): string | null {
  ensureDemoPinsSeeded();
  const pins = loadPins();
  return pins[userId] ?? null;
}

export function verifyUserPin(userId: string, pin: string): boolean {
  ensureDemoPinsSeeded();
  const stored = getUserSecurityPin(userId);
  if (!stored) return pin === DEMO_SECURITY_PIN;
  return stored === pin;
}

// ── Session unlock (cleared on tab close / new app launch) ───

export function isAppUnlocked(): boolean {
  try {
    return sessionStorage.getItem(APP_UNLOCK_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAppUnlocked(unlocked = true): void {
  try {
    if (unlocked) sessionStorage.setItem(APP_UNLOCK_SESSION_KEY, "1");
    else sessionStorage.removeItem(APP_UNLOCK_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function clearAppUnlock(): void {
  setAppUnlocked(false);
}

/** Mock async verify — ready for API swap. */
export async function mockVerifyAppPin(userId: string, pin: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 320));
  return verifyUserPin(userId, pin);
}
