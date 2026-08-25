/** Central LumenX fields that can be mapped onto certificate templates. */

export type CertificateFieldSource =
  | "student"
  | "teacher"
  | "institute"
  | "academic"
  | "sports"
  | "cultural"
  | "events";

export type CertificateCatalogField = {
  id: string;
  source: CertificateFieldSource;
  /** Shown in mapping UI and as the default mapping label. */
  displayName: string;
  /** Stable data path used when values are filled later. */
  dataField: string;
  /** Suggested required flag; mapping may override. */
  defaultRequired: boolean;
};

export type CertificateTemplateTarget = {
  id: string;
  /** Slide index (1-based) when detected from PPTX. */
  slide?: number;
  /** PowerPoint shape / text box name when available. */
  name: string;
  /** Current text in the box, used as a preview label. */
  previewText: string;
  source: "detected" | "manual";
};

export type CertificateFieldMapping = {
  targetId: string;
  displayName: string;
  dataFieldId: string;
  /**
   * true — a missing value is required (blocks issue later).
   * false — a missing value is allowed.
   */
  required: boolean;
};
