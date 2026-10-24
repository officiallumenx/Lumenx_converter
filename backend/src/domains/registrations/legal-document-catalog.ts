/**
 * Server-side legal document catalog for institute registration consent.
 *
 * Version convention: ISO calendar date (YYYY-MM-DD) matching
 * `@lumenx/legal` document `lastUpdated` (currently LUMENX_COMPANY.lastUpdated =
 * "4 September 2026" → 2026-09-04).
 *
 * When legal text materially changes:
 * 1. Update lastUpdated in packages/legal
 * 2. Update the versions below to match
 * 3. Do not backfill historical consent rows
 *
 * Kept in-backend (not imported from @lumenx/legal) so API typecheck stays Node-only.
 */

export const LEGAL_DOCUMENT_IDS = {
  ADMIN_TERMS: "admin_terms",
  ADMIN_PRIVACY: "admin_privacy",
  COOKIE_POLICY: "cookie_policy",
} as const;

export type LegalDocumentId =
  (typeof LEGAL_DOCUMENT_IDS)[keyof typeof LEGAL_DOCUMENT_IDS];

export type LegalDocumentVersionRef = {
  id: LegalDocumentId;
  version: string;
};

/** Must stay aligned with ADMIN_TERMS.lastUpdated in @lumenx/legal. */
export const ADMIN_TERMS_VERSION: LegalDocumentVersionRef = {
  id: LEGAL_DOCUMENT_IDS.ADMIN_TERMS,
  version: "2026-09-04",
};

/** Must stay aligned with ADMIN_PRIVACY.lastUpdated in @lumenx/legal. */
export const ADMIN_PRIVACY_VERSION: LegalDocumentVersionRef = {
  id: LEGAL_DOCUMENT_IDS.ADMIN_PRIVACY,
  version: "2026-09-04",
};

/** Must stay aligned with COOKIE_POLICY.lastUpdated in @lumenx/legal. */
export const COOKIE_POLICY_VERSION: LegalDocumentVersionRef = {
  id: LEGAL_DOCUMENT_IDS.COOKIE_POLICY,
  version: "2026-09-04",
};

export const REGISTRATION_REQUIRED_LEGAL_DOCUMENTS: readonly LegalDocumentVersionRef[] =
  [ADMIN_TERMS_VERSION, ADMIN_PRIVACY_VERSION];
