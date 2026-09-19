/**
 * Bridge: Admissions institute auth ↔ LumenX Admin accounts (same-origin localStorage).
 * Keys come from @lumenx/config ADMIN_STORAGE_KEYS (shared with Admin).
 * Hardcoded DEMO_USERS mirror removed (Wave 1 API-only auth).
 */

import { ADMIN_STORAGE_KEYS } from "@lumenx/config";
import { admissionsInstituteIdForAdminInstitute, normalizeEmail, normalizePhoneLast10 } from "@lumenx/utils";

const ADMIN_SESSION_KEY = ADMIN_STORAGE_KEYS.session;
const ADMIN_REGISTERED_KEY = ADMIN_STORAGE_KEYS.demoRegistered;

export type LumenxAdminIdentity = {
  email: string;
  name: string;
  phone?: string;
  instituteId: string;
  instituteName: string;
};

type AdminSessionLike = {
  email?: string;
  name?: string;
  phone?: string;
  instituteId?: string;
  instituteName?: string;
  expiresAt?: number;
};

type AdminRegisteredEntry = {
  email: string;
  password: string;
  phone?: string;
  user?: {
    name?: string;
    phone?: string;
    instituteId?: string;
    instituteName?: string;
  };
};

/** Map Admin institute ids → Admissions catalog ids when known. */
export function mapAdminInstituteToAdmissions(adminInstituteId: string): string {
  return admissionsInstituteIdForAdminInstitute(adminInstituteId);
}

function normalizePhone(value: string): string {
  return normalizePhoneLast10(value);
}

export function getActiveLumenxAdminSession(): LumenxAdminIdentity | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AdminSessionLike;
    if (session.expiresAt && Date.now() > session.expiresAt) return null;
    if (!session.email || !session.name) return null;
    return {
      email: normalizeEmail(session.email),
      name: session.name,
      phone: session.phone,
      instituteId: session.instituteId ?? "ins-test1school",
      instituteName: session.instituteName ?? "Test1School",
    };
  } catch {
    return null;
  }
}

/** Verify against registered Admin accounts only (no hardcoded DEMO_USERS). */
export function verifyLumenxAdminCredentials(
  identifier: string,
  password: string,
): LumenxAdminIdentity | null {
  const email = normalizeEmail(identifier);
  const phone = normalizePhone(identifier);
  const pwd = password.trim();
  if (!pwd) return null;

  try {
    const raw = localStorage.getItem(ADMIN_REGISTERED_KEY);
    if (!raw) return null;
    const entries = JSON.parse(raw) as AdminRegisteredEntry[];
    const match = entries.find((entry) => {
      if (entry.password !== pwd) return false;
      if (normalizeEmail(entry.email) === email) return true;
      const entryPhone = normalizePhone(entry.phone ?? entry.user?.phone ?? "");
      return Boolean(phone && entryPhone && entryPhone === phone);
    });
    if (!match) return null;
    return {
      email: normalizeEmail(match.email),
      name: match.user?.name ?? match.email.split("@")[0] ?? "Institute Admin",
      phone: match.phone ?? match.user?.phone,
      instituteId: match.user?.instituteId ?? "ins-test1school",
      instituteName: match.user?.instituteName ?? "Test1School",
    };
  } catch {
    return null;
  }
}
