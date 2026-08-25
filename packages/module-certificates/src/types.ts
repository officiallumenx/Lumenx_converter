/** Nexus is the source of truth for certificate template catalog (no issuing). */

import type {
  CertificateCatalogField,
  CertificateFieldMapping,
  CertificateFieldSource,
  CertificateTemplateTarget,
} from "./field-types";

export type CertificateTemplateStatus = "draft" | "published" | "archived";

export const CERTIFICATE_TEMPLATE_STATUSES: CertificateTemplateStatus[] = [
  "draft",
  "published",
  "archived",
];

export type CertificateTemplateFormat = "ppt" | "pptx";

export type CertificateCategory = {
  id: string;
  name: string;
  description: string;
  system: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CertificateTemplateFile = {
  fileName: string;
  format: CertificateTemplateFormat;
  sizeBytes: number;
  /** Data URL when the PPT/PPTX was persisted locally. */
  dataUrl?: string;
};

export type CertificateTemplate = {
  /** Immutable id of this version snapshot. Issued certificates should store this id. */
  id: string;
  /** Groups versions of the same template. */
  familyId: string;
  name: string;
  categoryId: string;
  description: string;
  version: number;
  status: CertificateTemplateStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
  /** Set when a newer version in this family is published. */
  supersededById?: string;
  file: CertificateTemplateFile;
  targets: CertificateTemplateTarget[];
  mappings: CertificateFieldMapping[];
};

export type CertificateTemplateCatalog = {
  version: 1;
  categories: CertificateCategory[];
  templates: CertificateTemplate[];
};

export type CreateCategoryInput = {
  name: string;
  description?: string;
};

export type CreateTemplateInput = {
  name: string;
  categoryId: string;
  description?: string;
  file: CertificateTemplateFile;
  targets?: CertificateTemplateTarget[];
};

export type {
  CertificateCatalogField,
  CertificateFieldMapping,
  CertificateFieldSource,
  CertificateTemplateTarget,
};
