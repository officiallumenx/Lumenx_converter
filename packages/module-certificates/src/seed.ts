import type { CertificateCategory, CertificateTemplateCatalog } from "./types";

export const CERTIFICATE_CATALOG_STORAGE_KEY = "lumenx.nexus.certificate-templates.v1";
export const CERTIFICATE_CATALOG_CHANGED_EVENT = "lumenx-nexus-certificate-templates-changed";

function stamp(iso: string): Pick<CertificateCategory, "createdAt" | "updatedAt"> {
  return { createdAt: iso, updatedAt: iso };
}

/** Default Nexus certificate categories — institutes consume these; Nexus can add more. */
export function seedCertificateCategories(now = "2026-01-15T09:00:00.000Z"): CertificateCategory[] {
  return [
    {
      id: "cat-academic-enrolment",
      name: "Academic & enrolment",
      description: "Study, bonafide, conduct, transfer, and migration certificates",
      system: true,
      ...stamp(now),
    },
    {
      id: "cat-achievement",
      name: "Achievement",
      description: "Academic excellence, attendance, and topper certificates",
      system: true,
      ...stamp(now),
    },
    {
      id: "cat-sports-activities",
      name: "Sports & activities",
      description: "Sports, arts, and extra-curricular certificates",
      system: true,
      ...stamp(now),
    },
  ];
}

export function createEmptyCertificateCatalog(): CertificateTemplateCatalog {
  return {
    version: 1,
    categories: seedCertificateCategories(),
    templates: [],
  };
}
