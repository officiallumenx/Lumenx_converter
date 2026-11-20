import { AppError } from "../../errors/app-error.js";
import {
  COOKIE_POLICY_VERSION,
  LEGAL_DOCUMENT_IDS,
  REGISTRATION_REQUIRED_LEGAL_DOCUMENTS,
  type LegalDocumentId,
} from "./legal-document-catalog.js";

export type RegistrationConsentAction =
  | "registration_accept"
  | "registration_resubmit";

/** Client consent assertion (untrusted until validated). */
export type RegistrationLegalConsentInput = {
  accepted?: unknown;
  documents?: unknown;
};

export type ValidatedConsentDocument = {
  id: LegalDocumentId;
  version: string;
};

export type ValidatedRegistrationLegalConsent = {
  accepted: true;
  action: RegistrationConsentAction;
  /** Server-authoritative acceptance time (ISO). */
  acceptedAt: string;
  /** Documents to persist (required + optional cookie when asserted). */
  documents: ValidatedConsentDocument[];
};

const ALLOWED_IDS = new Set<string>(Object.values(LEGAL_DOCUMENT_IDS));

const REQUIRED = REGISTRATION_REQUIRED_LEGAL_DOCUMENTS;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validate client consent assertion for institute registration.
 * - Requires explicit accepted=true
 * - Requires Terms + Privacy (current server versions)
 * - Cookie Policy is optional; when present must match current version
 * - Server stamps acceptedAt; does not trust client timestamps
 */
export function validateRegistrationLegalConsent(
  input: RegistrationLegalConsentInput | null | undefined,
  options?: { action?: RegistrationConsentAction; now?: Date },
): ValidatedRegistrationLegalConsent {
  if (input == null || typeof input !== "object") {
    throw AppError.validation(
      "Legal consent is required to register an institute.",
      { legal_consent: ["Required"] },
    );
  }

  if (input.accepted !== true) {
    throw AppError.validation(
      "You must accept the Terms of Service and Privacy Policy to register.",
      { "legal_consent.accepted": ["Must be true"] },
    );
  }

  if (!Array.isArray(input.documents) || input.documents.length === 0) {
    throw AppError.validation(
      "Legal consent documents are required.",
      { "legal_consent.documents": ["Required"] },
    );
  }

  const seen = new Map<string, string>();
  for (const entry of input.documents) {
    if (!isRecord(entry)) {
      throw AppError.validation("Malformed legal consent document entry.", {
        "legal_consent.documents": ["Invalid"],
      });
    }
    const id = entry.id;
    const version = entry.version;
    if (typeof id !== "string" || !ALLOWED_IDS.has(id)) {
      throw AppError.validation("Unknown or invalid legal document id.", {
        "legal_consent.documents": ["Invalid document id"],
      });
    }
    if (typeof version !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(version)) {
      throw AppError.validation("Invalid legal document version.", {
        "legal_consent.documents": ["Invalid version"],
      });
    }
    if (seen.has(id)) {
      throw AppError.validation("Duplicate legal document in consent assertion.", {
        "legal_consent.documents": ["Duplicate"],
      });
    }
    seen.set(id, version);
  }

  const documents: ValidatedConsentDocument[] = [];

  for (const required of REQUIRED) {
    const clientVersion = seen.get(required.id);
    if (!clientVersion) {
      throw AppError.validation(
        `Acceptance of ${required.id} is required.`,
        { "legal_consent.documents": [`Missing ${required.id}`] },
      );
    }
    if (clientVersion !== required.version) {
      throw AppError.validation(
        "Legal document version is out of date. Refresh and accept the current Terms and Privacy Policy.",
        { "legal_consent.documents": [`Stale ${required.id}`] },
      );
    }
    // Persist server-authoritative version (matches required.version after check).
    documents.push({ id: required.id, version: required.version });
  }

  const cookieVersion = seen.get(LEGAL_DOCUMENT_IDS.COOKIE_POLICY);
  if (cookieVersion !== undefined) {
    if (cookieVersion !== COOKIE_POLICY_VERSION.version) {
      throw AppError.validation(
        "Cookie Policy version is out of date. Refresh and try again.",
        { "legal_consent.documents": ["Stale cookie_policy"] },
      );
    }
    documents.push({
      id: LEGAL_DOCUMENT_IDS.COOKIE_POLICY,
      version: COOKIE_POLICY_VERSION.version,
    });
  }

  // Reject unexpected extra ids beyond known set (already filtered by ALLOWED_IDS).
  for (const id of seen.keys()) {
    if (
      id !== LEGAL_DOCUMENT_IDS.ADMIN_TERMS &&
      id !== LEGAL_DOCUMENT_IDS.ADMIN_PRIVACY &&
      id !== LEGAL_DOCUMENT_IDS.COOKIE_POLICY
    ) {
      throw AppError.validation("Unexpected legal document in consent assertion.", {
        "legal_consent.documents": ["Unexpected"],
      });
    }
  }

  return {
    accepted: true,
    action: options?.action ?? "registration_accept",
    acceptedAt: (options?.now ?? new Date()).toISOString(),
    documents,
  };
}

/** Build the client assertion payload for the current published documents. */
export function buildCurrentRegistrationConsentAssertion(options?: {
  includeCookiePolicy?: boolean;
}): {
  accepted: true;
  documents: ValidatedConsentDocument[];
} {
  const documents: ValidatedConsentDocument[] = REQUIRED.map((d) => ({
    id: d.id,
    version: d.version,
  }));
  if (options?.includeCookiePolicy !== false) {
    // Optional acknowledgment for transparency; not required by validate().
    documents.push({
      id: COOKIE_POLICY_VERSION.id,
      version: COOKIE_POLICY_VERSION.version,
    });
  }
  return { accepted: true, documents };
}
