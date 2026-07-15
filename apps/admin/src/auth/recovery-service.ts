/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Recovery Service (mock)
 *  User lookup, password overrides, PIN reset helpers.
 * ───────────────────────────────────────────────────────────── */

import { DEMO_USERS, type DemoCredential } from "./constants";
import { saveUserPin } from "./app-lock-store";
import { isValidEmail, normalizeLoginIdentifier, isValidLoginIdentifier } from "./validation";

const PASSWORD_OVERRIDES_KEY = "lx_password_overrides_v1";

type PasswordOverrides = Record<string, string>;

function loadPasswordOverrides(): PasswordOverrides {
  try {
    const raw = localStorage.getItem(PASSWORD_OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as PasswordOverrides) : {};
  } catch {
    return {};
  }
}

function writePasswordOverrides(overrides: PasswordOverrides): void {
  try {
    localStorage.setItem(PASSWORD_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

export function getPasswordOverride(email: string): string | null {
  return loadPasswordOverrides()[email.toLowerCase()] ?? null;
}

export function resolveDemoPassword(credential: DemoCredential): string {
  return getPasswordOverride(credential.email) ?? credential.password;
}

export function findDemoUserByEmail(email: string): DemoCredential | null {
  const normalized = email.trim().toLowerCase();
  return DEMO_USERS.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

function normalizePhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

export function findDemoUserByIdentifier(identifier: string): DemoCredential | null {
  const trimmed = normalizeLoginIdentifier(identifier);
  if (isValidEmail(trimmed)) {
    return findDemoUserByEmail(trimmed);
  }
  const phone = normalizePhoneDigits(trimmed);
  return (
    DEMO_USERS.find((u) => {
      const userPhone = normalizePhoneDigits(u.user.phone ?? "");
      return Boolean(userPhone && phone && userPhone === phone);
    }) ?? null
  );
}

export async function mockVerifyRecoveryLogin(
  identifier: string,
  password: string,
): Promise<DemoCredential> {
  await new Promise((r) => setTimeout(r, 700));
  if (!isValidLoginIdentifier(identifier)) {
    throw new Error("Enter a valid email address or mobile number.");
  }
  const match = findDemoUserByIdentifier(identifier);
  if (!match) {
    throw new Error("No account found with these credentials.");
  }
  const effective = resolveDemoPassword(match);
  if (effective !== password) {
    throw new Error("Invalid credentials. Please check your email/mobile and password.");
  }
  return match;
}

export async function mockLookupAccountByEmail(email: string): Promise<DemoCredential> {
  await new Promise((r) => setTimeout(r, 600));
  if (!isValidEmail(email)) {
    throw new Error("Enter a valid email address.");
  }
  const match = findDemoUserByEmail(email);
  if (!match) {
    throw new Error("No account found for this email address.");
  }
  return match;
}

export async function mockResetPassword(email: string, newPassword: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 800));
  const overrides = loadPasswordOverrides();
  overrides[email.toLowerCase()] = newPassword;
  writePasswordOverrides(overrides);
}

export async function mockResetPin(userId: string, newPin: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 600));
  if (!/^\d{6}$/.test(newPin)) {
    throw new Error("PIN must be exactly 6 digits.");
  }
  saveUserPin(userId, newPin);
}
