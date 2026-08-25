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
import {
  findAccessAssignee,
  getAccessRole,
  normalizePhone,
} from "@/lib/roles-access";

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

export function saveSession(user: AuthUser, remember = false): AuthSession {
  const ttl     = remember ? REMEMBER_TTL_MS : SESSION_TTL_MS;
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

// ── Mock credential lookup ────────────────────────────────────

/**
 * Mock authentication — replace this function body with a real API call.
 * Contract: resolves with AuthUser on success, rejects with Error on failure.
 */
function authUserFromAssignee(identifier: string): AuthUser | null {
  const assignee = findAccessAssignee(identifier);
  if (!assignee) return null;
  if (assignee.status !== "active") {
    throw new Error("This account has been suspended. Contact your administrator.");
  }
  const role = getAccessRole(assignee.roleId);
  if (!role) throw new Error("The assigned role no longer exists. Contact your administrator.");
  const initials = assignee.name
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
  return {
    id: assignee.id,
    email: assignee.email ?? "",
    phone: assignee.phone,
    name: assignee.name,
    initials,
    role: "coordinator",
    title: role.name,
    accessRoleId: role.id,
    instituteId: "LX-INST-001",
    instituteName: "LumenX International School",
    isVerified: true,
    mfaEnabled: true,
    createdAt: assignee.createdAt,
    lastLoginAt: new Date().toISOString(),
  };
}

function findRegisteredUserByIdentifier(identifier: string): AuthUser | null {
  const email = identifier.trim().toLowerCase();
  const phone = normalizePhone(identifier);
  const match = loadDemoRegistered().find(
    (entry) =>
      entry.email === email ||
      Boolean(phone && normalizePhone(entry.phone ?? entry.user.phone ?? "") === phone),
  );
  return match?.user ?? null;
}

export async function mockLookupUserByIdentifier(identifier: string): Promise<AuthUser> {
  const { DEMO_USERS, MOCK_API_DELAY_MS } = await import("./constants");
  await new Promise((resolve) => setTimeout(resolve, MOCK_API_DELAY_MS / 2));

  const customUser = authUserFromAssignee(identifier);
  if (customUser) return customUser;

  const email = identifier.trim().toLowerCase();
  const phone = normalizePhone(identifier);
  const demo = DEMO_USERS.find(
    (entry) =>
      entry.email.toLowerCase() === email ||
      Boolean(phone && normalizePhone(entry.user.phone ?? "") === phone),
  );
  if (demo) return demo.user;

  const registered = findRegisteredUserByIdentifier(identifier);
  if (registered) return registered;

  throw new Error("No Admin account exists for that email or mobile number.");
}

export async function mockSignIn(
  identifier: string,
  password: string,
): Promise<AuthUser> {
  const { DEMO_USERS, MOCK_API_DELAY_MS } = await import("./constants");
  await new Promise((r) => setTimeout(r, MOCK_API_DELAY_MS));

  const normalizedEmail = identifier.trim().toLowerCase();
  const normalizedPhone = normalizePhone(identifier);

  const assignee = findAccessAssignee(identifier);
  if (assignee) {
    const user = authUserFromAssignee(identifier);
    if (assignee.password !== password) {
      throw new Error("Incorrect password. Please try again.");
    }
    if (user) return user;
  }

  const match = DEMO_USERS.find((u) => {
    const effectivePassword = getPasswordOverride(u.email) ?? u.password;
    if (effectivePassword !== password) return false;
    if (u.email.toLowerCase() === normalizedEmail) return true;
    const userPhone = normalizePhone(u.user.phone ?? "");
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
    isVerified:    false, // must complete OTP + Nexus approval before dashboard
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
