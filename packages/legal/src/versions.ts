import { LUMENX_COMPANY } from "./company";
import { ADMIN_PRIVACY } from "./privacy";
import { ADMIN_TERMS } from "./terms";
import { COOKIE_POLICY } from "./cookies";

/**
 * Stable legal document identifiers used in consent recording.
 * Keep these stable across wording edits; only change when splitting/replacing a document.
 */
export const LEGAL_DOCUMENT_IDS = {
  ADMIN_TERMS: "admin_terms",
  ADMIN_PRIVACY: "admin_privacy",
  COOKIE_POLICY: "cookie_policy",
} as const;

export type LegalDocumentId =
  (typeof LEGAL_DOCUMENT_IDS)[keyof typeof LEGAL_DOCUMENT_IDS];

/**
 * Version convention for consent accountability:
 * Use the ISO calendar date (YYYY-MM-DD) of the document's `lastUpdated` field.
 *
 * When legal text materially changes:
 * 1. Update `LUMENX_COMPANY.lastUpdated` (and/or the document's lastUpdated).
 * 2. Ensure `legalVersionFromLastUpdated` still parses that date.
 * 3. Existing consent rows keep their historical version — do not backfill.
 */
export function legalVersionFromLastUpdated(lastUpdated: string): string {
  const trimmed = lastUpdated.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const months: Record<string, string> = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };
  const m = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!m) {
    throw new Error(`Unrecognized legal lastUpdated date: ${lastUpdated}`);
  }
  const day = m[1]!.padStart(2, "0");
  const month = months[m[2]!.toLowerCase()];
  if (!month) {
    throw new Error(`Unrecognized month in legal lastUpdated: ${lastUpdated}`);
  }
  return `${m[3]}-${month}-${day}`;
}

export type LegalDocumentVersionRef = {
  id: LegalDocumentId;
  version: string;
};

/** Current Admin Terms version (binding user agreement for institute registration). */
export const ADMIN_TERMS_VERSION: LegalDocumentVersionRef = {
  id: LEGAL_DOCUMENT_IDS.ADMIN_TERMS,
  version: legalVersionFromLastUpdated(ADMIN_TERMS.lastUpdated),
};

/** Current Admin Privacy Policy version (required for institute registration). */
export const ADMIN_PRIVACY_VERSION: LegalDocumentVersionRef = {
  id: LEGAL_DOCUMENT_IDS.ADMIN_PRIVACY,
  version: legalVersionFromLastUpdated(ADMIN_PRIVACY.lastUpdated),
};

/**
 * Cookie Policy version. Linked during registration for transparency.
 * Not a mandatory registration consent under product policy — necessary cookies
 * are covered by the Cookie Policy itself; do not require cookie acceptance
 * to submit institute registration.
 */
export const COOKIE_POLICY_VERSION: LegalDocumentVersionRef = {
  id: LEGAL_DOCUMENT_IDS.COOKIE_POLICY,
  version: legalVersionFromLastUpdated(COOKIE_POLICY.lastUpdated),
};

/** Documents the registration API requires in a consent assertion. */
export const REGISTRATION_REQUIRED_LEGAL_DOCUMENTS: readonly LegalDocumentVersionRef[] =
  [ADMIN_TERMS_VERSION, ADMIN_PRIVACY_VERSION];

/** Company-level lastUpdated used when documents inherit the shared stamp. */
export const LEGAL_COMPANY_VERSION = legalVersionFromLastUpdated(
  LUMENX_COMPANY.lastUpdated,
);
