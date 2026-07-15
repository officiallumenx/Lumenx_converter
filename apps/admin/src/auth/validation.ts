/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Validation Utilities
 *  Pure functions — no side effects, fully testable.
 * ───────────────────────────────────────────────────────────── */

import { VALIDATION } from "./constants";
import type {
  SignInFormData,
  SignInFormErrors,
  SignUpStep1Data,
  SignUpStep1Errors,
  SignUpStep2Data,
  SignUpStep2Errors,
  ForgotPasswordFormData,
  ForgotPasswordFormErrors,
  ForgotPinFormData,
  ForgotPinFormErrors,
} from "./types";

// ── Primitives ────────────────────────────────────────────────

export function isValidEmail(value: string): boolean {
  return VALIDATION.email.pattern.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return VALIDATION.phone.pattern.test(value.replace(/\s/g, ""));
}

/** Accepts a valid email address or Indian mobile number. */
export function isValidLoginIdentifier(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (isValidEmail(trimmed)) return true;
  if (isValidPhone(trimmed.replace(/\s/g, ""))) return true;
  const digits = trimmed.replace(/\D/g, "");
  return /^[6-9]\d{9}$/.test(digits.length > 10 ? digits.slice(-10) : digits);
}

export function normalizeLoginIdentifier(value: string): string {
  return value.trim();
}

/** Returns 0–4 representing password strength. */
export function getPasswordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  let score = 0;
  if (password.length >= VALIDATION.password.minLength)      score++;
  if (VALIDATION.password.requireUppercase.test(password))   score++;
  if (VALIDATION.password.requireNumber.test(password))      score++;
  if (VALIDATION.password.requireSpecial.test(password))     score++;
  return score as 0 | 1 | 2 | 3 | 4;
}

export type PasswordStrengthLabel = "Weak" | "Fair" | "Good" | "Strong";

export function getPasswordStrengthLabel(score: number): PasswordStrengthLabel {
  if (score <= 1) return "Weak";
  if (score === 2) return "Fair";
  if (score === 3) return "Good";
  return "Strong";
}

export function getPasswordStrengthColor(score: number): string {
  if (score <= 1) return "bg-destructive";
  if (score === 2) return "bg-warning";
  if (score === 3) return "bg-chart-5";
  return "bg-success";
}

/** Returns list of password rule failures (empty = passes all). */
export function getPasswordErrors(password: string): string[] {
  const errors: string[] = [];
  if (password.length < VALIDATION.password.minLength)
    errors.push(VALIDATION.password.minLengthMsg);
  if (!VALIDATION.password.requireUppercase.test(password))
    errors.push(VALIDATION.password.uppercaseMsg);
  if (!VALIDATION.password.requireNumber.test(password))
    errors.push(VALIDATION.password.numberMsg);
  return errors;
}

// ── Sign In ───────────────────────────────────────────────────

export function validateSignIn(data: SignInFormData): SignInFormErrors {
  const errors: SignInFormErrors = {};
  const identifier = normalizeLoginIdentifier(data.identifier);
  if (!identifier) {
    errors.identifier = "Email or mobile number is required";
  } else if (!isValidLoginIdentifier(identifier)) {
    errors.identifier = "Enter a valid email address or mobile number";
  }
  if (!data.password.trim()) {
    errors.password = "Password is required";
  } else if (data.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }
  return errors;
}

// ── Sign Up — Step 1 ──────────────────────────────────────────

export function validateSignUpStep1(data: SignUpStep1Data): SignUpStep1Errors {
  const errors: SignUpStep1Errors = {};
  if (!data.fullName.trim()) {
    errors.fullName = "Full name is required";
  } else if (data.fullName.trim().length < VALIDATION.name.minLength) {
    errors.fullName = "Name must be at least 2 characters";
  } else if (!VALIDATION.name.pattern.test(data.fullName.trim())) {
    errors.fullName = VALIDATION.name.message;
  }
  if (!data.email.trim()) {
    errors.email = "Email is required";
  } else if (!isValidEmail(data.email)) {
    errors.email = VALIDATION.email.message;
  }
  if (data.phone.trim() && !isValidPhone(data.phone)) {
    errors.phone = VALIDATION.phone.message;
  }
  if (!data.role) {
    errors.role = "Please select your role";
  }
  if (!data.designation.trim()) {
    errors.designation = "Designation is required";
  }
  return errors;
}

// ── Sign Up — Step 2 ──────────────────────────────────────────

export function validateSignUpStep2(data: SignUpStep2Data): SignUpStep2Errors {
  const errors: SignUpStep2Errors = {};
  const pwdErrors = getPasswordErrors(data.password);
  if (!data.password) {
    errors.password = "Password is required";
  } else if (pwdErrors.length > 0) {
    errors.password = pwdErrors[0];
  }
  if (!data.confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }
  if (!data.acceptTerms) {
    errors.acceptTerms = "You must accept the terms to continue";
  }
  return errors;
}

// ── Forgot Password ───────────────────────────────────────────

export function validateForgotPassword(
  data: ForgotPasswordFormData,
): ForgotPasswordFormErrors {
  const errors: ForgotPasswordFormErrors = {};
  if (!data.email.trim()) {
    errors.email = "Email is required";
  } else if (!isValidEmail(data.email)) {
    errors.email = VALIDATION.email.message;
  }
  return errors;
}

// ── Forgot PIN ────────────────────────────────────────────────

export function validateForgotPin(
  data: ForgotPinFormData,
): ForgotPinFormErrors {
  const errors: ForgotPinFormErrors = {};
  if (!data.email.trim()) {
    errors.email = "Email is required";
  } else if (!isValidEmail(data.email)) {
    errors.email = VALIDATION.email.message;
  }
  if (!data.employeeId.trim()) {
    errors.employeeId = "Employee ID is required";
  } else if (!VALIDATION.employeeId.pattern.test(data.employeeId.toUpperCase())) {
    errors.employeeId = VALIDATION.employeeId.message;
  }
  if (!data.dateOfBirth.trim()) {
    errors.dateOfBirth = "Date of birth is required";
  }
  return errors;
}

// ── Helpers ───────────────────────────────────────────────────

/** Returns true if an error map has any keys. */
export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some((v) => v !== undefined && v !== "");
}
