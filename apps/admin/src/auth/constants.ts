/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Authentication Constants
 *  Demo users, roles, validation rules, route definitions.
 * ───────────────────────────────────────────────────────────── */

import { ADMIN_STORAGE_KEYS } from "@lumenx/config";
import type { AuthUser, AdminRole } from "./types";

// ── Session ───────────────────────────────────────────────────

export const AUTH_SESSION_KEY = ADMIN_STORAGE_KEYS.session;
export const AUTH_REMEMBER_KEY = ADMIN_STORAGE_KEYS.remember;
export const DEMO_REGISTERED_KEY = ADMIN_STORAGE_KEYS.demoRegistered;
export const SESSION_TTL_MS     = 8 * 60 * 60 * 1000;   // 8 hours
export const REMEMBER_TTL_MS    = 30 * 24 * 60 * 60 * 1000; // 30 days

// ── Route constants ───────────────────────────────────────────

export const AUTH_ROUTES = [
  "/splash",
  "/welcome",
  "/login",
  "/signup",
  "/forgot-password",
  "/forgot-pin",
  "/pending-verification",
  "/verify-email-otp",
  "/verify-mobile-otp",
  "/institute-setup",
] as const;

export type AuthRoutePath = (typeof AUTH_ROUTES)[number];

/** Authenticated users hitting these should redirect into the app. */
export const POST_AUTH_LANDING_ROUTES = ["/welcome", "/login", "/splash"] as const;

export function isPostAuthLanding(pathname: string): boolean {
  return (POST_AUTH_LANDING_ROUTES as readonly string[]).includes(pathname);
}

export const DEFAULT_AFTER_LOGIN  = "/" as const;
export const DEFAULT_AFTER_LOGOUT = "/welcome" as const;

// ── Role labels ───────────────────────────────────────────────

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin:         "Super Admin",
  principal:           "Principal",
  vice_principal:      "Vice Principal",
  coordinator:         "Coordinator",
  admissions_officer:  "Admissions Officer",
  teacher:             "Teacher",
  accountant:          "Accountant",
  it_admin:            "IT Admin",
};

export const ROLE_OPTIONS: { value: AdminRole; label: string }[] = Object.entries(
  ROLE_LABELS,
).map(([value, label]) => ({ value: value as AdminRole, label }));

// ── Demo users ────────────────────────────────────────────────

export interface DemoCredential {
  email: string;
  password: string;
  label: string;
  user: AuthUser;
}

/**
 * Demo credentials must never ship in production bundles.
 * Kept empty so accidental imports cannot expose passwords.
 */
export const DEMO_USERS: DemoCredential[] = [];

// ── Validation rules ──────────────────────────────────────────

export const VALIDATION = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Please enter a valid email address",
  },
  password: {
    minLength:         8,
    minLengthMsg:      "Password must be at least 8 characters",
    requireUppercase:  /[A-Z]/,
    requireNumber:     /[0-9]/,
    requireSpecial:    /[^A-Za-z0-9]/,
    uppercaseMsg:      "Must include at least one uppercase letter",
    numberMsg:         "Must include at least one number",
    specialMsg:        "Must include at least one special character",
  },
  name: {
    minLength: 2,
    maxLength: 80,
    pattern:   /^[a-zA-Z\s.'-]+$/,
    message:   "Name must contain only letters, spaces, and basic punctuation",
  },
  phone: {
    pattern: /^(\+91[\s-]?)?[6-9]\d{9}$/,
    message: "Enter a valid Indian mobile number (e.g. +91 98765 43210)",
  },
  employeeId: {
    pattern: /^[A-Z0-9-]{4,16}$/,
    message: "Employee ID must be 4–16 uppercase alphanumeric characters",
  },
} as const;

// ── Simulated API delay ───────────────────────────────────────

export const MOCK_API_DELAY_MS = 900;
