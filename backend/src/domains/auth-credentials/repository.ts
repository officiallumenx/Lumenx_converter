/**
 * Server-side login factors on existing user_profile:
 * username + PIN (scrypt hash). Passwords remain in Supabase Auth.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import { ensureDbOk } from "../../db/errors.js";

export type UserAuthCredentialRow = {
  user_id: string;
  username: string | null;
  pin_hash: string | null;
  pin_salt: string | null;
  pin_set_at: string | null;
  first_login_completed_at: string | null;
  phone_verified_at: string | null;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileAuthRow = {
  id: string;
  username: string | null;
  pin_hash: string | null;
  pin_salt: string | null;
  pin_set_at: string | null;
  first_login_completed_at: string | null;
  phone_verified_at: string | null;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

const COLS =
  "id, username, pin_hash, pin_salt, pin_set_at, first_login_completed_at, phone_verified_at, email_verified_at, created_at, updated_at";

const PIN_RE = /^\d{4,8}$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,64}$/;

function toCredentialRow(row: ProfileAuthRow): UserAuthCredentialRow {
  return {
    user_id: row.id,
    username: row.username,
    pin_hash: row.pin_hash,
    pin_salt: row.pin_salt,
    pin_set_at: row.pin_set_at,
    first_login_completed_at: row.first_login_completed_at,
    phone_verified_at: row.phone_verified_at,
    email_verified_at: row.email_verified_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function assertValidUsername(value: string): string {
  const username = normalizeUsername(value);
  if (!USERNAME_RE.test(username)) {
    throw AppError.validation(
      "Username must be 3–64 characters (letters, numbers, . _ -).",
      { username: ["Invalid"] },
    );
  }
  return username;
}

export function assertValidPin(value: string): string {
  const pin = value.trim();
  if (!PIN_RE.test(pin)) {
    throw AppError.validation("PIN must be 4–8 digits.", { pin: ["Invalid"] });
  }
  return pin;
}

export function hashPin(pin: string, saltHex?: string): { hash: string; salt: string } {
  const salt = saltHex ?? randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPinHash(pin: string, hash: string, salt: string): boolean {
  try {
    const next = scryptSync(pin, salt, 64);
    const expected = Buffer.from(hash, "hex");
    if (next.length !== expected.length) return false;
    return timingSafeEqual(next, expected);
  } catch {
    return false;
  }
}

export async function findCredentialByUserId(
  admin: SupabaseClient,
  userId: string,
): Promise<UserAuthCredentialRow | null> {
  const result = await admin
    .from("user_profile")
    .select(COLS)
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  const row = result.data as ProfileAuthRow | null;
  return row ? toCredentialRow(row) : null;
}

export async function findCredentialByUsername(
  admin: SupabaseClient,
  username: string,
): Promise<UserAuthCredentialRow | null> {
  const normalized = normalizeUsername(username);
  const result = await admin
    .from("user_profile")
    .select(COLS)
    .ilike("username", normalized)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  const row = result.data as ProfileAuthRow | null;
  return row ? toCredentialRow(row) : null;
}

export type UpsertCredentialInput = {
  userId: string;
  username?: string | null;
  pin?: string | null;
  markFirstLoginCompleted?: boolean;
  markPhoneVerified?: boolean;
  markEmailVerified?: boolean;
};

/**
 * Updates auth-factor columns on existing user_profile (no separate credentials table).
 */
export async function upsertUserAuthCredential(
  admin: SupabaseClient,
  input: UpsertCredentialInput,
): Promise<UserAuthCredentialRow> {
  const existing = await findCredentialByUserId(admin, input.userId);
  if (!existing) {
    throw AppError.notFound("User profile not found for auth credentials.");
  }

  const patch: Record<string, unknown> = {};

  if (input.username !== undefined) {
    if (input.username === null || input.username.trim() === "") {
      patch.username = null;
    } else {
      const username = assertValidUsername(input.username);
      const taken = await findCredentialByUsername(admin, username);
      if (taken && taken.user_id !== input.userId) {
        throw AppError.conflict("Username is already taken.");
      }
      patch.username = username;
    }
  }

  if (input.pin !== undefined && input.pin !== null && input.pin.trim() !== "") {
    const pin = assertValidPin(input.pin);
    const { hash, salt } = hashPin(pin);
    patch.pin_hash = hash;
    patch.pin_salt = salt;
    patch.pin_set_at = new Date().toISOString();
  }

  if (input.markFirstLoginCompleted) {
    patch.first_login_completed_at =
      existing.first_login_completed_at ?? new Date().toISOString();
  }
  if (input.markPhoneVerified) {
    patch.phone_verified_at =
      existing.phone_verified_at ?? new Date().toISOString();
  }
  if (input.markEmailVerified) {
    patch.email_verified_at =
      existing.email_verified_at ?? new Date().toISOString();
  }

  if (Object.keys(patch).length === 0) {
    return existing;
  }

  const result = await admin
    .from("user_profile")
    .update(patch)
    .eq("id", input.userId)
    .is("deleted_at", null)
    .select(COLS)
    .single();
  return toCredentialRow(ensureDbOk(result) as ProfileAuthRow);
}

export function isFirstLogin(cred: UserAuthCredentialRow | null): boolean {
  return !cred?.first_login_completed_at;
}

export function hasPin(cred: UserAuthCredentialRow | null): boolean {
  return Boolean(cred?.pin_hash && cred?.pin_salt);
}

export function assertPinMatches(
  cred: UserAuthCredentialRow | null,
  pin: string | undefined,
  opts?: { required?: boolean },
): void {
  const required = opts?.required ?? true;
  if (!hasPin(cred)) {
    if (required && pin) {
      throw AppError.validation("Set a PIN on this account before using PIN login.", {
        pin: ["Not set"],
      });
    }
    if (required) {
      throw AppError.validation("PIN is required for this account.", { pin: ["Required"] });
    }
    return;
  }
  if (!pin || !pin.trim()) {
    throw AppError.validation("PIN is required.", { pin: ["Required"] });
  }
  const ok = verifyPinHash(assertValidPin(pin), cred!.pin_hash!, cred!.pin_salt!);
  if (!ok) {
    throw AppError.validation("Incorrect PIN.", { pin: ["Invalid"] });
  }
}

export type AuthWorkflowFlags = {
  firstLogin: boolean;
  requiresDualOtp: boolean;
  requiresPin: boolean;
  hasUsername: boolean;
  hasPin: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
};

export function workflowFlagsFromCredential(
  cred: UserAuthCredentialRow | null,
  opts?: {
    dualOtpOnFirstLogin?: boolean;
    /** When true (Nexus notebook), mobile + email OTP are required on every login. */
    dualOtpAlways?: boolean;
    pinAlways?: boolean;
  },
): AuthWorkflowFlags {
  const firstLogin = isFirstLogin(cred);
  const dualFirst = opts?.dualOtpOnFirstLogin ?? true;
  const dualAlways = opts?.dualOtpAlways ?? false;
  const pinAlways = opts?.pinAlways ?? true;
  return {
    firstLogin,
    requiresDualOtp: dualAlways || (dualFirst && firstLogin),
    requiresPin: pinAlways || hasPin(cred),
    hasUsername: Boolean(cred?.username),
    hasPin: hasPin(cred),
    phoneVerified: Boolean(cred?.phone_verified_at),
    emailVerified: Boolean(cred?.email_verified_at),
  };
}
