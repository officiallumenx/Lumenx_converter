/**
 * Portal auth store for Parent / Student / Teacher portals.
 *
 * Rules:
 * - No password, no email login.
 * - Mobile must already exist in the school + portal's user directory.
 * - OTP-only verification (demo: DEMO_CONNECT_OTP).
 * - Optional 4-digit Login PIN (separate from App Lock).
 * - Maximum 4 active sessions; 5th login drops oldest.
 */
import { DEMO_CONNECT_OTP } from "@lumenx/auth";
import { normalizePhoneDigits } from "@lumenx/utils";
import { readDemoProfileId } from "@lumenx/types";
import type { Role } from "@lumenx/types";
import { getConnectStudentProfile } from "@/lib/mock-data";

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

// ─── Demo mobile directory ────────────────────────────────────────────────────

function parentDirectoryKey(): string {
  return `lumenx.admin.parents.v2.${readDemoProfileId()}`;
}

function studentAuthKey(): string {
  return "lumenx.connect.studentAuth.v1";
}

interface ParentRecord {
  id: string;
  name: string;
  phone: string;
  accessStatus?: "active" | "hold" | "suspended";
}

interface StudentAuthAccount {
  phoneKey: string;
  instituteId: string;
  studentId: string;
  name: string;
  passwordHash: string | null;
  hasCompletedSetup: boolean;
}

function loadParents(): ParentRecord[] {
  try {
    const raw = localStorage.getItem(parentDirectoryKey());
    return raw ? (JSON.parse(raw) as ParentRecord[]) : [];
  } catch {
    return [];
  }
}

function loadStudentAccounts(): StudentAuthAccount[] {
  try {
    const raw = localStorage.getItem(studentAuthKey());
    return raw ? (JSON.parse(raw) as StudentAuthAccount[]) : [];
  } catch {
    return [];
  }
}

const DEMO_TEACHER_PHONES = ["9876543210", "9999999999", "9988776655"];

function normalize(phone: string): string {
  return normalizePhoneDigits(phone);
}

function studentPhoneKey(phone: string, instituteId: string): string {
  return `${normalize(phone)}@${instituteId}`;
}

/**
 * Verify the mobile number exists in the school + portal's user directory.
 * Returns ok=false with a specific message when not found.
 */
export function checkMobileRegistered(
  phone: string,
  role: PortalRole,
  instituteId: string,
): MobileCheckResult {
  const digits = normalize(phone);
  if (!/^\d{10}$/.test(digits)) {
    return { ok: false, error: "Enter a valid 10-digit mobile number." };
  }

  if (role === "parent") {
    const parents = loadParents();
    if (parents.length > 0) {
      const found = parents.find((p) => normalize(p.phone) === digits);
      if (!found) {
        return {
          ok: false,
          error:
            "This mobile number is not registered with this school. Please contact your school administration.",
        };
      }
      if (found.accessStatus === "suspended") {
        return { ok: false, error: "This parent account is suspended. Contact the institute." };
      }
      if (found.accessStatus === "hold") {
        return { ok: false, error: "This parent account is on hold. Contact the institute." };
      }
      return { ok: true, displayName: found.name };
    }
    // Demo fallback — any 10-digit number is accepted when no directory exists
    return { ok: true };
  }

  if (role === "student") {
    // Check Admin-provisioned student auth
    const accounts = loadStudentAccounts();
    const key = studentPhoneKey(digits, instituteId);
    const found = accounts.find((a) => a.phoneKey === key);
    if (found) return { ok: true, displayName: found.name };

    // Demo: known phones always valid
    const demoProfile = getConnectStudentProfile();
    if (digits === normalize(demoProfile.id) || digits === "9876543210" || digits === "9123456789") {
      return { ok: true, displayName: demoProfile.name };
    }

    return {
      ok: false,
      error:
        "This mobile number is not registered with this school. Please contact your school administration.",
    };
  }

  if (role === "teacher") {
    // Demo: known teacher phones
    if (DEMO_TEACHER_PHONES.includes(digits)) {
      return { ok: true };
    }
    // Any 10-digit number is accepted in demo (no teacher directory yet)
    return { ok: true };
  }

  return { ok: false, error: "Unknown portal." };
}

/** Generate (demo) OTP — in production this would call an SMS API. */
export function sendOtp(_phone: string, _instituteId: string): void {
  // Demo: OTP is always DEMO_CONNECT_OTP. Production: call SMS API here.
}

/**
 * Verify the OTP the user entered.
 * Returns isFirstLogin=true when a student has never completed setup.
 */
export function verifyOtp(
  otp: string,
  phone: string,
  role: PortalRole,
  instituteId: string,
): OtpVerifyResult {
  if (otp !== DEMO_CONNECT_OTP) {
    return { ok: false, error: "Incorrect code. Try again." };
  }

  if (role === "student") {
    const key = studentPhoneKey(normalize(phone), instituteId);
    const accounts = loadStudentAccounts();
    const found = accounts.find((a) => a.phoneKey === key);
    const isFirstLogin = !found || !found.hasCompletedSetup;
    return { ok: true, isFirstLogin };
  }

  return { ok: true, isFirstLogin: false };
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
