/**
 * Portal auth store for Parent / Student / Teacher portals.
 *
 * Session / Login PIN helpers remain for local device state.
 * Demo OTP verification has been removed — use Connect API login OTP.
 */
import { normalizePhoneDigits } from "@lumenx/utils";

// ─── Storage keys ────────────────────────────────────────────────────────────

const SESSIONS_KEY = "lumenx.portal.sessions.v1";
const PIN_KEY = "lumenx.portal.loginPin.v1";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PortalRole = "parent" | "student" | "teacher";

export interface PortalSession {
  /** Unique per sign-in event */
  sessionId: string;
  phone: string;
  role: PortalRole;
  instituteId: string;
  displayName?: string;
  signedInAt: string;
  /** Browser/device hint for display */
  deviceHint: string;
}

export type MobileCheckResult =
  | { ok: true; displayName?: string }
  | { ok: false; error: string };

export type OtpVerifyResult =
  | { ok: true; isFirstLogin: boolean }
  | { ok: false; error: string };

function normalize(phone: string): string {
  return normalizePhoneDigits(phone);
}

/** @deprecated Local directory auth removed — use apiConnectLoginMode. */
export function checkMobileRegistered(
  _phone: string,
  _role: PortalRole,
  _instituteId: string,
): MobileCheckResult {
  return { ok: false, error: DEMO_OTP_REMOVED };
}

const DEMO_OTP_REMOVED =
  "Demo OTP auth has been removed. Use Connect API login OTP (VITE_CONNECT_AUTH_MODE=api).";

/** @deprecated Demo OTP send removed — callers must use apiRequestConnectLoginOtp. */
export function sendOtp(_phone: string, _instituteId: string): void {
  throw new Error(DEMO_OTP_REMOVED);
}

/**
 * @deprecated Demo OTP verify removed — callers must use apiVerifyConnectLoginOtp.
 */
export function verifyOtp(
  _otp: string,
  _phone: string,
  _role: PortalRole,
  _instituteId: string,
): OtpVerifyResult {
  throw new Error(DEMO_OTP_REMOVED);
}

// ─── Session management (max 4 devices) ──────────────────────────────────────

function loadSessions(): PortalSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as PortalSession[]) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: PortalSession[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // ignore
  }
}

function deviceHint(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "Android";
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/macintosh/i.test(ua) && /mobile/i.test(ua)) return "iPad";
  if (/macintosh/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows PC";
  return "Browser";
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const MAX_SESSIONS = 4;

/**
 * Create a new portal session.
 * If 4 sessions already exist, the oldest is removed before adding the new one.
 */
export function createPortalSession(
  phone: string,
  role: PortalRole,
  instituteId: string,
  displayName?: string,
): PortalSession {
  const sessions = loadSessions();

  // Remove any existing session for this exact phone+role+institute
  const withoutCurrent = sessions.filter(
    (s) => !(s.phone === phone && s.role === role && s.instituteId === instituteId),
  );

  // Enforce max 4 devices — drop oldest (earliest signedInAt)
  const capped =
    withoutCurrent.length >= MAX_SESSIONS
      ? withoutCurrent
          .slice()
          .sort((a, b) => a.signedInAt.localeCompare(b.signedInAt))
          .slice(1)
      : withoutCurrent;

  const newSession: PortalSession = {
    sessionId: generateSessionId(),
    phone,
    role,
    instituteId,
    displayName,
    signedInAt: new Date().toISOString(),
    deviceHint: deviceHint(),
  };

  saveSessions([...capped, newSession]);
  return newSession;
}

export function getPortalSessions(): PortalSession[] {
  return loadSessions();
}

export function removePortalSession(sessionId: string): void {
  saveSessions(loadSessions().filter((s) => s.sessionId !== sessionId));
}

export function clearPortalSessionsForPhone(phone: string, role: PortalRole): void {
  saveSessions(loadSessions().filter((s) => !(s.phone === phone && s.role === role)));
}

// ─── Login PIN / Two-step verification (separate from App Lock) ──────────────

export const LOGIN_PIN_LENGTH = 4;
const PIN_REGEX = /^\d{4}$/;

type LoginPinEntry = {
  pin: string;
  /** When false, PIN is kept but not required at login. */
  enabled: boolean;
};

/** Legacy value was a bare PIN string (= enabled). */
type LoginPinStore = Record<string, LoginPinEntry | string>;

type LoginPinListener = () => void;
const loginPinListeners = new Set<LoginPinListener>();

function notifyLoginPinListeners() {
  loginPinListeners.forEach((l) => l());
}

function loginPinKey(phone: string, role: PortalRole): string {
  return `${normalize(phone)}:${role}`;
}

function loadPins(): LoginPinStore {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    return raw ? (JSON.parse(raw) as LoginPinStore) : {};
  } catch {
    return {};
  }
}

function savePins(pins: LoginPinStore): void {
  try {
    localStorage.setItem(PIN_KEY, JSON.stringify(pins));
  } catch {
    // ignore
  }
  notifyLoginPinListeners();
}

function normalizeEntry(value: LoginPinEntry | string | undefined): LoginPinEntry | null {
  if (!value) return null;
  if (typeof value === "string") {
    return PIN_REGEX.test(value) ? { pin: value, enabled: true } : null;
  }
  if (typeof value.pin === "string" && PIN_REGEX.test(value.pin)) {
    return { pin: value.pin, enabled: Boolean(value.enabled) };
  }
  return null;
}

function readEntry(phone: string, role: PortalRole): LoginPinEntry | null {
  return normalizeEntry(loadPins()[loginPinKey(phone, role)]);
}

function writeEntry(phone: string, role: PortalRole, entry: LoginPinEntry | null): void {
  const pins = loadPins();
  const key = loginPinKey(phone, role);
  if (!entry) delete pins[key];
  else pins[key] = entry;
  savePins(pins);
}

export function subscribeLoginPin(listener: LoginPinListener): () => void {
  loginPinListeners.add(listener);
  return () => loginPinListeners.delete(listener);
}

/** Returns true when a login PIN has been set for this user (enabled or not). */
export function hasLoginPin(phone: string, role: PortalRole): boolean {
  return Boolean(readEntry(phone, role)?.pin);
}

/** Two-step verification is on and will be required after OTP at login. */
export function isLoginPinEnabled(phone: string, role: PortalRole): boolean {
  const entry = readEntry(phone, role);
  return Boolean(entry?.enabled && entry.pin);
}

/** Alias for login gate: enabled + PIN present. */
export function requiresLoginPin(phone: string, role: PortalRole): boolean {
  return isLoginPinEnabled(phone, role);
}

/** Set/update the 4-digit login PIN and enable two-step verification. */
export function setLoginPin(
  phone: string,
  role: PortalRole,
  pin: string,
): { ok: true } | { ok: false; error: string } {
  if (!PIN_REGEX.test(pin)) return { ok: false, error: "PIN must be exactly 4 digits." };
  writeEntry(phone, role, { pin, enabled: true });
  return { ok: true };
}

/** Turn two-step on using an already-saved PIN. */
export function enableLoginPin(phone: string, role: PortalRole): { ok: true } | { ok: false; error: string } {
  const entry = readEntry(phone, role);
  if (!entry?.pin) return { ok: false, error: "Create a Login PIN first." };
  writeEntry(phone, role, { ...entry, enabled: true });
  return { ok: true };
}

/** Turn two-step off; PIN remains saved for re-enable. */
export function disableLoginPin(phone: string, role: PortalRole): void {
  const entry = readEntry(phone, role);
  if (!entry) return;
  writeEntry(phone, role, { ...entry, enabled: false });
}

/** Verify a supplied 4-digit PIN against the stored one. */
export function verifyLoginPin(phone: string, role: PortalRole, pin: string): boolean {
  const entry = readEntry(phone, role);
  if (!entry) return false;
  return entry.pin === pin;
}

/** Remove login PIN entirely (disable + clear). */
export function clearLoginPin(phone: string, role: PortalRole): void {
  writeEntry(phone, role, null);
}

/** @deprecated Use LOGIN_PIN_LENGTH */
export const PIN_LENGTH = LOGIN_PIN_LENGTH;
