/**
 * Institute registration legal consent — links, validation, client-side record,
 * draft persistence, and the consent assertion sent to the registration API.
 *
 * There is no separate "User Agreement" document; Admin Terms of Service is the
 * binding agreement. Server requires Terms + Privacy; Cookie Policy is linked for
 * transparency and may be acknowledged optionally (not required to register).
 */

import {
  ADMIN_PRIVACY_VERSION,
  ADMIN_TERMS_VERSION,
  COOKIE_POLICY_VERSION,
  REGISTRATION_REQUIRED_LEGAL_DOCUMENTS,
} from "@lumenx/legal";
import { SIGNUP_LEGAL_LINKS } from "./constants";
import type { RegistrationLegalConsentAssertion } from "@/lib/registrations/types";

export { SIGNUP_LEGAL_LINKS };

export const SIGNUP_CONSENT_REQUIRED_MESSAGE =
  "You must read and agree to the Privacy Policy and Terms of Service before creating your account.";

export const SIGNUP_CONSENT_CHECKBOX_ID = "signup-accept-legal-agreements";

export const SIGNUP_LEGAL_CONSENT_STORAGE_KEY =
  "lumenx.admin.signupLegalConsent.v1";

export const SIGNUP_DRAFT_STORAGE_KEY = "lumenx.admin.signupDraft.v1";

export type SignupLegalConsentRecord = {
  acceptedAt: string;
  email: string;
  registrationId?: string;
  documents: readonly string[];
};

/** Serializable multi-step signup draft (no File objects). */
export type SignupFormDraft = {
  step: number;
  s1: object;
  s2: object;
  s3: object;
  s4: object;
  mobileGrant?: string;
  maskedOtpDest?: string;
};

/** In-memory fallback when sessionStorage is unavailable (SSR / Vitest node). */
const memoryStore = new Map<string, string>();

function storageGet(key: string): string | null {
  try {
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem(key);
    }
  } catch {
    /* private mode */
  }
  return memoryStore.get(key) ?? null;
}

function storageSet(key: string, value: string): void {
  memoryStore.set(key, value);
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(key, value);
    }
  } catch {
    /* quota / private mode — memory still holds value for this session */
  }
}

function storageRemove(key: string): void {
  memoryStore.delete(key);
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

export function assertSignupLegalConsent(acceptTerms: boolean): void {
  if (!acceptTerms) {
    throw new Error(SIGNUP_CONSENT_REQUIRED_MESSAGE);
  }
}

/**
 * Build the consent assertion for POST /api/v1/registrations.
 * Includes required Terms + Privacy; Cookie Policy acknowledgment is optional
 * for the server but included when the registration checkbox is accepted so
 * the applicant's acknowledgment of the linked Cookie Policy is durable.
 */
export function buildRegistrationLegalConsentAssertion(): RegistrationLegalConsentAssertion {
  return {
    accepted: true,
    documents: [
      ...REGISTRATION_REQUIRED_LEGAL_DOCUMENTS.map((d) => ({
        id: d.id,
        version: d.version,
      })),
      {
        id: COOKIE_POLICY_VERSION.id,
        version: COOKIE_POLICY_VERSION.version,
      },
    ],
  };
}

export function recordSignupLegalConsent(
  email: string,
  registrationId?: string,
): SignupLegalConsentRecord {
  const assertion = buildRegistrationLegalConsentAssertion();
  const record: SignupLegalConsentRecord = {
    acceptedAt: new Date().toISOString(),
    email: email.trim().toLowerCase(),
    registrationId,
    documents: assertion.documents.map((d) => d.id),
  };
  storageSet(SIGNUP_LEGAL_CONSENT_STORAGE_KEY, JSON.stringify(record));
  return record;
}

export function clearSignupLegalConsent(): void {
  storageRemove(SIGNUP_LEGAL_CONSENT_STORAGE_KEY);
}

export function getSignupLegalConsent(): SignupLegalConsentRecord | null {
  try {
    const raw = storageGet(SIGNUP_LEGAL_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SignupLegalConsentRecord;
  } catch {
    return null;
  }
}

export function saveSignupFormDraft(draft: SignupFormDraft): void {
  try {
    storageSet(SIGNUP_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Quota — form still works; new-tab legal links preserve state.
  }
}

export function loadSignupFormDraft(): SignupFormDraft | null {
  try {
    const raw = storageGet(SIGNUP_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SignupFormDraft;
  } catch {
    return null;
  }
}

export function clearSignupFormDraft(): void {
  storageRemove(SIGNUP_DRAFT_STORAGE_KEY);
}

/** Validate consent field only (used by step validation + tests). */
export function validateSignupLegalConsent(acceptTerms: boolean): string | undefined {
  if (!acceptTerms) return SIGNUP_CONSENT_REQUIRED_MESSAGE;
  return undefined;
}

export function signupLegalLinkHrefs(): readonly string[] {
  return SIGNUP_LEGAL_LINKS.map((l) => l.to);
}

export const SIGNUP_REQUIRED_DOCUMENT_VERSIONS = {
  terms: ADMIN_TERMS_VERSION,
  privacy: ADMIN_PRIVACY_VERSION,
} as const;
