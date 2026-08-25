import { MODULE_IDS } from "@lumenx/config/module-ids";

export const MODULE_ID = MODULE_IDS.certificates;
export const MIN_PLAN = "max" as const;
export const OWNER_APP = "nexus" as const;
export const MODULE_NAME = "Certificates";

export type {
  CertificateCatalogField,
  CertificateCategory,
  CertificateFieldMapping,
  CertificateFieldSource,
  CertificateTemplate,
  CertificateTemplateCatalog,
  CertificateTemplateFile,
  CertificateTemplateFormat,
  CertificateTemplateStatus,
  CertificateTemplateTarget,
  CreateCategoryInput,
  CreateTemplateInput,
} from "./types";

export { CERTIFICATE_TEMPLATE_STATUSES } from "./types";

export {
  CERTIFICATE_CATALOG_CHANGED_EVENT,
  CERTIFICATE_CATALOG_STORAGE_KEY,
  createEmptyCertificateCatalog,
  seedCertificateCategories,
} from "./seed";

export {
  CERTIFICATE_UPLOAD_ACCEPT,
  CERTIFICATE_UPLOAD_HINT,
  CERTIFICATE_UPLOAD_MAX_BYTES,
  parseCertificateUpload,
  readFileAsDataUrl,
} from "./office-upload";

export {
  CERTIFICATE_FIELD_CATALOG,
  CERTIFICATE_FIELD_SOURCES,
  certificateFieldSourceLabel,
  getCertificateCatalogField,
  isCertificateFieldStudentSpecific,
  listCertificateFieldsBySource,
} from "./field-catalog";

export {
  CERTIFICATE_NUMBER_DATA_FIELD,
  DEFAULT_CERTIFICATE_NUMBER_DIGITS,
  DEFAULT_CERTIFICATE_NUMBER_FORMAT,
  MAX_CERTIFICATE_NUMBER_DIGITS,
  MIN_CERTIFICATE_NUMBER_DIGITS,
  certificateNumberFormatError,
  clampCertificateNumberDigits,
  formatCertificateNumber,
  isCertificateNumberDataField,
  normalizeCertificateNumberFormat,
  previewCertificateNumber,
} from "./numbering";

export { detectCertificateTemplateTargets } from "./pptx-targets";

export type {
  CertificateFillValues,
  CertificatePreviewPicture,
  CertificatePreviewText,
  CertificateSlidePreview,
} from "./pptx-fill";

export {
  buildCertificateSlidePreview,
  fillCertificatePptxCopies,
  fillCertificatePptxCopy,
  filledPptxBlob,
} from "./pptx-fill";

export {
  buildCertificatePrintHtml,
  certificateFieldsFallbackHtml,
  certificateSlideToHtml,
} from "./certificate-html";

export { bytesToBlob, zipStore } from "./zip-store";

export {
  certificateMappingHasValue,
  isCertificateMappingValueMissing,
} from "./mapping-rules";

export type {
  CertificateFieldFillStatus,
  CertificateFieldValueSource,
  CertificateIssuanceOverrides,
  CertificatePopulateContext,
  PopulatedCertificateMapping,
} from "./populate";

export {
  applyCertificateIssuanceOverrides,
  applyCertificateNumberToFields,
  certificateFieldFillStatus,
  certificateFillValuesFromFields,
  certificateRequiredFieldsComplete,
  copyCertificateIssuanceValue,
  populateCertificateMappings,
} from "./populate";

export {
  addCertificateTemplateTarget,
  archiveCertificateTemplate,
  clearCertificateFieldMapping,
  createCertificateCategory,
  createCertificateTemplate,
  createCertificateTemplateDraftVersion,
  ensureCertificateTemplateTargets,
  getCertificateCategory,
  getCertificateTemplate,
  listCertificateCategories,
  listCertificateTemplateVersions,
  listCertificateTemplates,
  loadCertificateCatalog,
  publishCertificateTemplate,
  saveCertificateFieldMapping,
  subscribeCertificateCatalog,
} from "./store";

export {
  getLatestPublishedCertificateTemplate,
  getPublishedCertificateTemplate,
  listPublishedCertificateCategories,
  listPublishedCertificateTemplates,
} from "./admin-catalog";
