/**
 * Admin consumption API for Nexus certificate templates.
 * Unpublished templates are never returned. Do not use Nexus list/get helpers
 * to pick a template for Admin.
 */
import {
  getCertificateTemplate,
  listCertificateCategories,
  listCertificateTemplates,
} from "./store";
import type { CertificateCategory, CertificateTemplate } from "./types";

function isPublished(template: CertificateTemplate): boolean {
  return template.status === "published";
}

/**
 * Templates Admin apps may use. Draft and archived versions are excluded.
 * At most one published version per template family; if data is inconsistent,
 * the highest version wins.
 */
export function listPublishedCertificateTemplates(): CertificateTemplate[] {
  const latestByFamily = new Map<string, CertificateTemplate>();
  for (const template of listCertificateTemplates()) {
    if (!isPublished(template)) continue;
    const current = latestByFamily.get(template.familyId);
    if (!current || template.version > current.version) {
      latestByFamily.set(template.familyId, template);
    }
  }
  return [...latestByFamily.values()];
}

/** Categories that currently have at least one published template. */
export function listPublishedCertificateCategories(): CertificateCategory[] {
  const used = new Set(
    listPublishedCertificateTemplates().map((template) => template.categoryId),
  );
  return listCertificateCategories().filter((category) => used.has(category.id));
}

/** Returns the template only when it is the published version Admin may use. */
export function getPublishedCertificateTemplate(
  id: string,
): CertificateTemplate | undefined {
  const template = getCertificateTemplate(id);
  if (!template || !isPublished(template)) return undefined;
  return template;
}

/** Latest published version in a family, if any. */
export function getLatestPublishedCertificateTemplate(
  familyId: string,
): CertificateTemplate | undefined {
  return listPublishedCertificateTemplates().find(
    (template) => template.familyId === familyId,
  );
}
