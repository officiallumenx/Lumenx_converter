/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Auth Store (LocalStorage persistence layer)
 *  Abstracts all session read/write.
 *  Replace with secure HTTP-only cookies + API in production.
 * ───────────────────────────────────────────────────────────── */

import {
  AUTH_SESSION_KEY,
  AUTH_REMEMBER_KEY,
  DEMO_REGISTERED_KEY,
  SESSION_TTL_MS,
  REMEMBER_TTL_MS,
} from "./constants";
import type { AuthSession, AuthUser, AdminRole } from "./types";
import { getPasswordOverride } from "./recovery-service";

// ── Helpers ───────────────────────────────────────────────────

function generateMockToken(userId: string): string {
  const header  = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ sub: userId, iat: Date.now() }));
  const sig     = btoa(`mock-signature-${userId}-${Date.now()}`);
  return `${header}.${payload}.${sig}`;
}

// ── Demo registered users (persist sign-ups for re-login) ─────

interface DemoRegisteredEntry {
  email: string;
  password: string;
  phone?: string;
  user: AuthUser;
}

function loadDemoRegistered(): DemoRegisteredEntry[] {
  try {
    const raw = localStorage.getItem(DEMO_REGISTERED_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DemoRegisteredEntry[];
  } catch {
    return [];
  }
}

function saveDemoRegistered(entries: DemoRegisteredEntry[]): void {
  try {
    localStorage.setItem(DEMO_REGISTERED_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage errors
  }
}

export function registerDemoUser(
  email: string,
  password: string,
  user: AuthUser,
  phone?: string,
): void {
  const normalized = email.trim().toLowerCase();
  const entries = loadDemoRegistered().filter((e) => e.email !== normalized);
  entries.push({ email: normalized, password, phone, user });
  saveDemoRegistered(entries);
}

function findDemoRegisteredUser(
  identifier: string,
  password: string,
): AuthUser | null {
  const normalizedEmail = identifier.trim().toLowerCase();
  const normalizedPhone = normalizePhoneDigits(identifier);
  const match = loadDemoRegistered().find((entry) => {
    if (entry.password !== password) return false;
    if (entry.email === normalizedEmail) return true;
    const entryPhone = normalizePhoneDigits(entry.phone ?? entry.user.phone ?? "");
    return Boolean(entryPhone && normalizedPhone && entryPhone === normalizedPhone);
  });
  return match ? { ...match.user, lastLoginAt: new Date().toISOString() } : null;
}

// ── Session read/write ────────────────────────────────────────

export function saveSession(user: AuthUser, remember = false): AuthSession {
  const ttl     = remember ? REMEMBER_TTL_MS : SESSION_TTL_MS;
  const session: AuthSession = {
    userId:        user.id,
    email:         user.email,
    name:          user.name,
    initials:      user.initials,
    role:          user.role,
    title:         user.title,
    instituteId:   user.instituteId,
    instituteName: user.instituteName,
    token:         generateMockToken(user.id),
    issuedAt:      Date.now(),
    expiresAt:     Date.now() + ttl,
  };
  try {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    if (remember) localStorage.setItem(AUTH_REMEMBER_KEY, "1");
    else          localStorage.removeItem(AUTH_REMEMBER_KEY);
  } catch (_) {
    // storage unavailable (private mode, quota exceeded, etc.)
  }
  return session;
}

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }
    return session;
  } catch (_) {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_REMEMBER_KEY);
  } catch (_) {
    // ignore
  }
}

export function isSessionValid(): boolean {
  return loadSession() !== null;
}

// ── Session → AuthUser reconstruction ────────────────────────

export function sessionToUser(session: AuthSession): AuthUser {
  return {
    id:            session.userId,
    email:         session.email,
    name:          session.name,
    initials:      session.initials,
    role:          session.role as AdminRole,
    title:         session.title,
    instituteId:   session.instituteId,
    instituteName: session.instituteName,
    isVerified:    true,
    mfaEnabled:    false,
    createdAt:     new Date(session.issuedAt).toISOString(),
    lastLoginAt:   new Date(session.issuedAt).toISOString(),
  };
}

// ── Mock credential lookup ────────────────────────────────────

/**
 * Mock authentication — replace this function body with a real API call.
 * Contract: resolves with AuthUser on success, rejects with Error on failure.
 */
function normalizePhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

export async function mockSignIn(
  identifier: string,
  password: string,
): Promise<AuthUser> {
  const { DEMO_USERS, MOCK_API_DELAY_MS } = await import("./constants");
  await new Promise((r) => setTimeout(r, MOCK_API_DELAY_MS));

  const normalizedEmail = identifier.trim().toLowerCase();
  const normalizedPhone = normalizePhoneDigits(identifier);

  const match = DEMO_USERS.find((u) => {
    const effectivePassword = getPasswordOverride(u.email) ?? u.password;
    if (effectivePassword !== password) return false;
    if (u.email.toLowerCase() === normalizedEmail) return true;
    const userPhone = normalizePhoneDigits(u.user.phone ?? "");
    return Boolean(userPhone && normalizedPhone && userPhone === normalizedPhone);
  });

  if (!match) {
    const registered = findDemoRegisteredUser(identifier, password);
    if (registered) return registered;
    throw new Error("Invalid credentials. Please check your email/mobile and password.");
  }
  return { ...match.user, lastLoginAt: new Date().toISOString() };
}

/**
 * Mock sign-up — replace with POST /auth/register API call.
 */
export async function mockSignUp(
  email: string,
  name: string,
  role: AdminRole,
  title: string,
  options?: { phone?: string; instituteName?: string; password?: string },
): Promise<AuthUser> {
  const { MOCK_API_DELAY_MS } = await import("./constants");
  await new Promise((r) => setTimeout(r, MOCK_API_DELAY_MS));

  const initials = name
    .split(" ")
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);

  const user: AuthUser = {
    id:            `LX-ADM-${Date.now().toString(36).toUpperCase()}`,
    email:         email.toLowerCase(),
    name,
    initials,
    role,
    title,
    phone:         options?.phone,
    instituteId:   `LX-INST-${Date.now().toString(36).toUpperCase()}`,
    instituteName: options?.instituteName?.trim() || "Demo Institute",
    isVerified:    true, // demo: auto-approved — no admin review required
    mfaEnabled:    false,
    createdAt:     new Date().toISOString(),
  };

  if (options?.password) {
    registerDemoUser(user.email, options.password, user, options.phone);
  }

  return user;
}

/**
 * Mock forgot-password — replace with POST /auth/forgot-password API call.
 */
export async function mockForgotPassword(_email: string): Promise<void> {
  const { MOCK_API_DELAY_MS } = await import("./constants");
  await new Promise((r) => setTimeout(r, MOCK_API_DELAY_MS));
  // In production: sends a reset link to the email
}

/**
 * Mock forgot-pin — replace with POST /auth/forgot-pin API call.
 */
export async function mockForgotPin(
  _email: string,
  _employeeId: string,
): Promise<void> {
  const { MOCK_API_DELAY_MS } = await import("./constants");
  await new Promise((r) => setTimeout(r, MOCK_API_DELAY_MS));
}
