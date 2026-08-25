import { DEMO_CONNECT_PASSWORD } from "@lumenx/auth";
import { normalizePhoneDigits } from "@lumenx/utils";
import { getConnectStudentProfile } from "@/lib/mock-data";

/** Institute-issued temporary password for first-time student sign-in. */
export const STUDENT_DEFAULT_PASSWORD = "student123";

const STORAGE_KEY = "lumenx.connect.studentAuth.v1";
const PENDING_KEY = "lumenx.connect.studentAuth.pending.v1";

/** Demo returning student — completed setup, uses chosen password. */
export const DEMO_RETURNING_STUDENT_PHONE = "9876543210";

/** Demo first-time student — use default password, then set a new one. */
export const DEMO_FIRST_TIME_STUDENT_PHONE = "9123456789";

interface StudentAuthAccount {
  phoneKey: string;
  instituteId: string;
  studentId: string;
  name: string;
  passwordHash: string | null;
  hasCompletedSetup: boolean;
}

interface PendingStudentSetup {
  phoneKey: string;
  password: string;
}

export type StudentSignInResult =
  | { ok: true; isFirstLogin: boolean }
  | { ok: false; notFound: true }
  | { ok: false; error: string };

function normalizePhone(phone: string): string {
  return normalizePhoneDigits(phone);
}

function phoneKey(phone: string, instituteId: string): string {
  return `${normalizePhone(phone)}@${instituteId}`;
}

function loadAccounts(): StudentAuthAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StudentAuthAccount[];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: StudentAuthAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
}

function loadPending(): PendingStudentSetup | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingStudentSetup;
  } catch {
    return null;
  }
}

function savePending(pending: PendingStudentSetup | null): void {
  try {
    if (pending) sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

function seedName(digits: string): string {
  if (digits === DEMO_RETURNING_STUDENT_PHONE) return getConnectStudentProfile().name;
  if (digits === DEMO_FIRST_TIME_STUDENT_PHONE) return "Vihaan Sharma";
  return "Student";
}

function seedStudentId(digits: string): string {
  if (digits === DEMO_RETURNING_STUDENT_PHONE) return getConnectStudentProfile().id;
  if (digits === DEMO_FIRST_TIME_STUDENT_PHONE) return "S-2105";
  return `S-NEW-${digits}`;
}

function findAccount(phone: string, instituteId: string): StudentAuthAccount | null {
  const key = phoneKey(phone, instituteId);
  return loadAccounts().find((a) => a.phoneKey === key) ?? null;
}

function createFirstTimeAccount(phone: string, instituteId: string): StudentAuthAccount {
  const key = phoneKey(phone, instituteId);
  const digits = normalizePhone(phone);
  const account: StudentAuthAccount = {
    phoneKey: key,
    instituteId,
    studentId: seedStudentId(digits),
    name: seedName(digits),
    passwordHash: null,
    hasCompletedSetup: false,
  };
  const accounts = loadAccounts();
  accounts.push(account);
  saveAccounts(accounts);
  return account;
}

function getOrCreateAccount(phone: string, instituteId: string): StudentAuthAccount {
  return findAccount(phone, instituteId) ?? createFirstTimeAccount(phone, instituteId);
}

/**
 * Password step for students.
 * First-time wrong password → notFound (back to phone).
 * Demo password on new/existing incomplete account → first login.
 */
export function attemptStudentPassword(
  phone: string,
  instituteId: string,
  password: string,
): StudentSignInResult {
  const account = findAccount(phone, instituteId);
  const digits = normalizePhone(phone);

  if (!account) {
    if (digits === DEMO_RETURNING_STUDENT_PHONE && password === DEMO_CONNECT_PASSWORD) {
      const returning: StudentAuthAccount = {
        phoneKey: phoneKey(phone, instituteId),
        instituteId,
        studentId: seedStudentId(digits),
        name: seedName(digits),
        passwordHash: DEMO_CONNECT_PASSWORD,
        hasCompletedSetup: true,
      };
      const accounts = loadAccounts();
      accounts.push(returning);
      saveAccounts(accounts);
      return { ok: true, isFirstLogin: false };
    }
    if (password !== STUDENT_DEFAULT_PASSWORD) {
      return { ok: false, notFound: true };
    }
    createFirstTimeAccount(phone, instituteId);
    return { ok: true, isFirstLogin: true };
  }

  if (!account.hasCompletedSetup) {
    if (password !== STUDENT_DEFAULT_PASSWORD) {
      return { ok: false, notFound: true };
    }
    return { ok: true, isFirstLogin: true };
  }

  if (password !== account.passwordHash) {
    return { ok: false, error: "Incorrect password" };
  }

  return { ok: true, isFirstLogin: false };
}

/** @deprecated Use attemptStudentPassword */
export function verifyStudentPassword(
  phone: string,
  instituteId: string,
  password: string,
): StudentSignInResult {
  return attemptStudentPassword(phone, instituteId, password);
}

export function validateNewStudentPassword(password: string, confirm: string): string | null {
  if (password !== confirm) return "Passwords do not match";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Include at least one uppercase letter";
  if (!/[0-9]/.test(password)) return "Include at least one number";
  return null;
}

/** Stage new password between first OTP and second OTP (first-time setup). */
export function stageStudentNewPassword(
  phone: string,
  instituteId: string,
  password: string,
  confirm: string,
): { ok: true } | { ok: false; error: string } {
  const validationError = validateNewStudentPassword(password, confirm);
  if (validationError) return { ok: false, error: validationError };
  const account = findAccount(phone, instituteId);
  if (!account || account.hasCompletedSetup) {
    return { ok: false, error: "No first-time setup in progress" };
  }
  savePending({ phoneKey: phoneKey(phone, instituteId), password });
  return { ok: true };
}

/** Final step: confirm password matches staged value, then activate account. */
export function finalizeStudentFirstLogin(
  phone: string,
  instituteId: string,
  password: string,
): { ok: true } | { ok: false; error: string } {
  const pending = loadPending();
  const key = phoneKey(phone, instituteId);
  if (!pending || pending.phoneKey !== key) {
    return { ok: false, error: "Setup session expired — start again from your number" };
  }
  if (password !== pending.password) {
    return { ok: false, error: "Password does not match what you set earlier" };
  }

  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.phoneKey === key);
  if (idx === -1) return { ok: false, error: "Student account not found" };

  accounts[idx] = {
    ...accounts[idx]!,
    passwordHash: pending.password,
    hasCompletedSetup: true,
  };
  saveAccounts(accounts);
  savePending(null);
  return { ok: true };
}

export function clearStudentPendingSetup(): void {
  savePending(null);
}

/** Forgot / reset password for returning students (after OTP). */
export function resetStudentPassword(
  phone: string,
  instituteId: string,
  password: string,
  confirm: string,
): { ok: true } | { ok: false; error: string } {
  const validationError = validateNewStudentPassword(password, confirm);
  if (validationError) return { ok: false, error: validationError };

  const key = phoneKey(phone, instituteId);
  const accounts = loadAccounts();
  const idx = accounts.findIndex((a) => a.phoneKey === key);
  if (idx === -1) return { ok: false, error: "No account found for this number" };
  if (!accounts[idx]!.hasCompletedSetup) {
    return { ok: false, error: "Use your institute demo password for first-time sign-in" };
  }

  accounts[idx] = { ...accounts[idx]!, passwordHash: password };
  saveAccounts(accounts);
  return { ok: true };
}

export function getStudentAccountDisplayName(phone: string, instituteId: string): string {
  const account = findAccount(phone, instituteId);
  if (account) return account.name;
  const digits = normalizePhone(phone);
  return seedName(digits);
}

export function studentAccountExists(phone: string, instituteId: string): boolean {
  return Boolean(findAccount(phone, instituteId)?.hasCompletedSetup);
}
