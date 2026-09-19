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
import { normalizePhone } from "@/lib/roles-access";

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
  const normalizedPhone = normalizePhone(identifier);
  const match = loadDemoRegistered().find((entry) => {
    if (entry.password !== password) return false;
    if (entry.email === normalizedEmail) return true;
    const entryPhone = normalizePhone(entry.phone ?? entry.user.phone ?? "");
    return Boolean(entryPhone && normalizedPhone && entryPhone === normalizedPhone);
  });
  return match ? { ...match.user, lastLoginAt: new Date().toISOString() } : null;
}

// ── Session read/write ────────────────────────────────────────

export function saveSession(
  user: AuthUser,
  remember = false,
  options?: { authSource?: "demo" | "api"; token?: string },
): AuthSession {
  const ttl     = remember ? REMEMBER_TTL_MS : SESSION_TTL_MS;
  const authSource = options?.authSource ?? "api";
  const session: AuthSession = {
    userId:        user.id,
    email:         user.email,
    phone:         user.phone,
    name:          user.name,
    initials:      user.initials,
    role:          user.role,
    title:         user.title,
    accessRoleId:  user.accessRoleId,
    instituteId:   user.instituteId,
    instituteName: user.instituteName,
    isVerified:    user.isVerified,
    // API mode never persists a JWT here — Supabase Auth storage is authoritative.
    token:         authSource === "api" ? "" : (options?.token ?? generateMockToken(user.id)),
    authSource,
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
    phone:         session.phone,
    name:          session.name,
    initials:      session.initials,
    role:          session.role as AdminRole,
    title:         session.title,
    accessRoleId:  session.accessRoleId,
    instituteId:   session.instituteId,
    instituteName: session.instituteName,
    // Legacy sessions without the field were always treated as verified demos.
    isVerified:    session.isVerified !== false,
    mfaEnabled:    false,
    createdAt:     new Date(session.issuedAt).toISOString(),
    lastLoginAt:   new Date(session.issuedAt).toISOString(),
  };
}

/** Persist verification + institute binding after Nexus approves registration. */
export function applyApprovedRegistrationToUser(
  user: AuthUser,
  opts: { instituteId: string; instituteName: string },
): AuthUser {
  const next: AuthUser = {
    ...user,
    isVerified: true,
    // Fresh institutes get full Admin access (principal / system role).
    accessRoleId: user.accessRoleId ?? "ROL-001",
    role: user.role || "principal",
    instituteId: opts.instituteId,
    instituteName: opts.instituteName,
  };
  const entries = loadDemoRegistered();
  const idx = entries.findIndex(
    (e) => e.email === user.email.trim().toLowerCase() || e.user.id === user.id,
  );
  if (idx >= 0) {
    entries[idx] = {
      ...entries[idx]!,
      user: { ...entries[idx]!.user, ...next },
    };
    saveDemoRegistered(entries);
  }
  return next;
}

// ── Mock credential lookup (disabled — API-only) ─────────────

export async function mockLookupUserByIdentifier(_identifier: string): Promise<AuthUser> {
  throw new Error("Admin demo account lookup has been removed. Use API authentication.");
}

export async function mockSignIn(
  _identifier: string,
  _password: string,
): Promise<AuthUser> {
  throw new Error("Admin demo sign-in has been removed. Use API authentication.");
}

/** Mock sign-up — disabled (API-only product mode). */
export async function mockSignUp(
  _email: string,
  _name: string,
  _role: AdminRole,
  _title: string,
  _options?: { phone?: string; instituteName?: string; password?: string },
): Promise<AuthUser> {
  throw new Error("Admin demo sign-up has been removed. Use API authentication.");
}

export async function mockForgotPassword(_email: string): Promise<void> {
  const { assertNotDemoFallback } = await import("@lumenx/auth");
  assertNotDemoFallback("api", "Admin mockForgotPassword");
}

export async function mockForgotPin(
  _email: string,
  _employeeId: string,
): Promise<void> {
  const { assertNotDemoFallback } = await import("@lumenx/auth");
  assertNotDemoFallback("api", "Admin mockForgotPin");
}
