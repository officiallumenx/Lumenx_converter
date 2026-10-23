export { LUMENX_COMPANY } from "./company";
export type { LegalDocument, LegalSection, LumenxAppId } from "./types";

export {
  PLATFORM_TERMS,
  ADMIN_TERMS,
  NEXUS_TERMS,
  CONNECT_TERMS,
  ADMISSIONS_TERMS,
  CAREERS_TERMS,
  TRANSPORT_TERMS,
} from "./terms";

export {
  PLATFORM_PRIVACY,
  ADMIN_PRIVACY,
  NEXUS_PRIVACY,
  CONNECT_PRIVACY,
  ADMISSIONS_PRIVACY,
  CAREERS_PRIVACY,
  TRANSPORT_PRIVACY,
} from "./privacy";

export { COOKIE_POLICY, legalDocumentToPlainText } from "./cookies";

export {
  LEGAL_DOCUMENT_IDS,
  LEGAL_COMPANY_VERSION,
  ADMIN_TERMS_VERSION,
  ADMIN_PRIVACY_VERSION,
  COOKIE_POLICY_VERSION,
  REGISTRATION_REQUIRED_LEGAL_DOCUMENTS,
  legalVersionFromLastUpdated,
  type LegalDocumentId,
  type LegalDocumentVersionRef,
} from "./versions";
