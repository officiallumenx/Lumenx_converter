import {
  CERTIFICATE_CATALOG_CHANGED_EVENT,
  CERTIFICATE_CATALOG_STORAGE_KEY,
  createEmptyCertificateCatalog,
} from "./seed";
import type {
  CertificateFieldMapping,
  CertificateTemplateTarget,
} from "./field-types";
import { getCertificateCatalogField } from "./field-catalog";
import { detectCertificateTemplateTargets } from "./pptx-targets";
import type {
  CertificateCategory,
  CertificateTemplate,
  CertificateTemplateCatalog,
  CertificateTemplateStatus,
  CreateCategoryInput,
  CreateTemplateInput,
} from "./types";

let cachedRaw: string | null = null;
let cachedSnapshot: CertificateTemplateCatalog | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: "tpl" | "fam"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function slugFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return slug || "category";
}

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CERTIFICATE_CATALOG_CHANGED_EVENT));
}

function cloneTemplate(template: CertificateTemplate): CertificateTemplate {
  return {
    ...template,
    file: { ...template.file },
    targets: (template.targets ?? []).map((target) => ({ ...target })),
    mappings: (template.mappings ?? []).map((mapping) => ({ ...mapping })),
  };
}

function normalizeStatus(status: unknown): CertificateTemplateStatus {
  if (status === "active" || status === "published") return "published";
  if (status === "archived") return "archived";
  return "draft";
}

function normalizeTemplate(template: CertificateTemplate): CertificateTemplate {
  return {
    ...template,
    familyId: template.familyId || template.id,
    version: typeof template.version === "number" && template.version > 0 ? template.version : 1,
    status: normalizeStatus(template.status),
    targets: Array.isArray(template.targets) ? template.targets : [],
    mappings: Array.isArray(template.mappings) ? template.mappings : [],
  };
}

function write(next: CertificateTemplateCatalog): CertificateTemplateCatalog {
  const snapshot: CertificateTemplateCatalog = {
    version: 1,
    categories: next.categories.map((c) => ({ ...c })),
    templates: next.templates.map(cloneTemplate),
  };
  cachedSnapshot = snapshot;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = JSON.stringify(snapshot);
      cachedRaw = raw;
      localStorage.setItem(CERTIFICATE_CATALOG_STORAGE_KEY, raw);
    } catch {
      cachedRaw = null;
    }
  }
  notify();
  return snapshot;
}

function read(): CertificateTemplateCatalog {
  const raw =
    typeof localStorage === "undefined"
      ? null
      : localStorage.getItem(CERTIFICATE_CATALOG_STORAGE_KEY);
  if (cachedSnapshot !== null && raw === cachedRaw) {
    return cachedSnapshot;
  }
  try {
    if (!raw) {
      const seeded = createEmptyCertificateCatalog();
      cachedSnapshot = seeded;
      cachedRaw = null;
      return write(seeded);
    }
    const parsed = JSON.parse(raw) as CertificateTemplateCatalog;
    const snapshot: CertificateTemplateCatalog = {
      version: 1,
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      templates: Array.isArray(parsed.templates)
        ? parsed.templates.map((template) => normalizeTemplate(template))
        : [],
    };
    if (snapshot.categories.length === 0) {
      snapshot.categories = createEmptyCertificateCatalog().categories;
    }
    cachedSnapshot = snapshot;
    cachedRaw = raw;
    return snapshot;
  } catch {
    const seeded = createEmptyCertificateCatalog();
    cachedSnapshot = seeded;
    cachedRaw = null;
    return write(seeded);
  }
}

export function loadCertificateCatalog(): CertificateTemplateCatalog {
  return read();
}

export function listCertificateCategories(): CertificateCategory[] {
  return read().categories;
}

export function listCertificateTemplates(): CertificateTemplate[] {
  return read().templates;
}

export function listCertificateTemplateVersions(familyId: string): CertificateTemplate[] {
  return read()
    .templates.filter((template) => template.familyId === familyId)
    .sort((a, b) => b.version - a.version);
}

export function getCertificateCategory(id: string): CertificateCategory | undefined {
  return read().categories.find((c) => c.id === id);
}

export function getCertificateTemplate(id: string): CertificateTemplate | undefined {
  const found = read().templates.find((t) => t.id === id);
  return found ? normalizeTemplate(found) : undefined;
}

export function createCertificateCategory(input: CreateCategoryInput): CertificateCategory {
  const name = input.name.trim();
  if (!name) throw new Error("Category name is required");
  const catalog = read();
  const exists = catalog.categories.some(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (exists) throw new Error("A category with that name already exists");
  const at = nowIso();
  const category: CertificateCategory = {
    id: `cat-${slugFromName(name)}-${Date.now().toString(36)}`,
    name,
    description: (input.description ?? "").trim(),
    system: false,
    createdAt: at,
    updatedAt: at,
  };
  write({
    ...catalog,
    categories: [...catalog.categories, category],
  });
  return category;
}

export function createCertificateTemplate(input: CreateTemplateInput): CertificateTemplate {
  const name = input.name.trim();
  if (!name) throw new Error("Template name is required");
  const catalog = read();
  if (!catalog.categories.some((c) => c.id === input.categoryId)) {
    throw new Error("Choose a valid category");
  }
  if (!input.file?.fileName || !input.file.format) {
    throw new Error("Upload a PPT or PPTX file");
  }
  const at = nowIso();
  const template: CertificateTemplate = {
    id: newId("tpl"),
    familyId: newId("fam"),
    name,
    categoryId: input.categoryId,
    description: (input.description ?? "").trim(),
    version: 1,
    status: "draft",
    createdAt: at,
    updatedAt: at,
    file: { ...input.file },
    targets: (input.targets ?? []).map((target) => ({ ...target })),
    mappings: [],
  };
  write({
    ...catalog,
    templates: [...catalog.templates, template],
  });
  return template;
}

function nextVersionNumber(familyId: string, templates: CertificateTemplate[]): number {
  let max = 0;
  for (const template of templates) {
    if (template.familyId === familyId && template.version > max) max = template.version;
  }
  return max + 1;
}

function forkDraftVersion(
  current: CertificateTemplate,
  templates: CertificateTemplate[],
): CertificateTemplate {
  const at = nowIso();
  const copy = cloneTemplate(current);
  delete copy.publishedAt;
  delete copy.archivedAt;
  delete copy.supersededById;
  return {
    ...copy,
    id: newId("tpl"),
    familyId: current.familyId,
    version: nextVersionNumber(current.familyId, templates),
    status: "draft",
    createdAt: at,
    updatedAt: at,
  };
}

/**
 * Drafts mutate in place. Published and archived snapshots stay frozen;
 * content changes create a new draft version instead.
 */
function mutateTemplateContent(
  id: string,
  updater: (current: CertificateTemplate) => CertificateTemplate,
): CertificateTemplate {
  const catalog = read();
  const current = catalog.templates.find((t) => t.id === id);
  if (!current) throw new Error("Template not found");
  const normalized = normalizeTemplate(current);
  if (normalized.status === "draft") {
    const next = updater(normalized);
    write({
      ...catalog,
      templates: catalog.templates.map((t) => (t.id === id ? next : t)),
    });
    return next;
  }
  const draft = updater(forkDraftVersion(normalized, catalog.templates));
  write({
    ...catalog,
    templates: [...catalog.templates, draft],
  });
  return draft;
}

/** Makes this version available to Admin. Other published versions in the family are archived. */
export function publishCertificateTemplate(id: string): CertificateTemplate {
  const catalog = read();
  const current = catalog.templates.find((t) => t.id === id);
  if (!current) throw new Error("Template not found");
  const normalized = normalizeTemplate(current);
  if (normalized.status === "published") return normalized;
  const at = nowIso();
  const published: CertificateTemplate = {
    ...normalized,
    status: "published",
    publishedAt: at,
    archivedAt: undefined,
    supersededById: undefined,
    updatedAt: at,
  };
  write({
    ...catalog,
    templates: catalog.templates.map((template) => {
      if (template.id === id) return published;
      if (template.familyId === normalized.familyId && template.status === "published") {
        return {
          ...normalizeTemplate(template),
          status: "archived" as const,
          archivedAt: at,
          supersededById: id,
          updatedAt: at,
        };
      }
      return template;
    }),
  });
  return published;
}

/**
 * Explicitly create a new draft version from any snapshot.
 * Published / archived content stays frozen for already-issued certificates.
 */
export function createCertificateTemplateDraftVersion(id: string): CertificateTemplate {
  const catalog = read();
  const current = catalog.templates.find((t) => t.id === id);
  if (!current) throw new Error("Template not found");
  const normalized = normalizeTemplate(current);
  if (normalized.status === "draft") {
    return normalized;
  }
  const draft = forkDraftVersion(normalized, catalog.templates);
  write({
    ...catalog,
    templates: [...catalog.templates, draft],
  });
  return draft;
}

/** Removes this version from Admin. Content is kept so issued certificates stay unchanged. */
export function archiveCertificateTemplate(id: string): CertificateTemplate {
  const catalog = read();
  const current = catalog.templates.find((t) => t.id === id);
  if (!current) throw new Error("Template not found");
  const normalized = normalizeTemplate(current);
  if (normalized.status === "archived") return normalized;
  const at = nowIso();
  const archived: CertificateTemplate = {
    ...normalized,
    status: "archived",
    archivedAt: at,
    updatedAt: at,
  };
  write({
    ...catalog,
    templates: catalog.templates.map((t) => (t.id === id ? archived : t)),
  });
  return archived;
}

export async function ensureCertificateTemplateTargets(
  id: string,
): Promise<CertificateTemplate> {
  const current = getCertificateTemplate(id);
  if (!current) throw new Error("Template not found");
  if (current.targets.length > 0) return current;
  const detected = await detectCertificateTemplateTargets(current.file);
  if (detected.length === 0) return current;
  return mutateTemplateContent(id, (template) => ({
    ...template,
    targets: detected,
    updatedAt: nowIso(),
  }));
}

export function addCertificateTemplateTarget(
  id: string,
  name: string,
): CertificateTemplate {
  const label = name.trim();
  if (!label) throw new Error("Target name is required");
  return mutateTemplateContent(id, (template) => {
    const index = template.targets.length + 1;
    const target: CertificateTemplateTarget = {
      id: `manual-${Date.now().toString(36)}-${index}`,
      name: label,
      previewText: "",
      source: "manual",
    };
    return {
      ...template,
      targets: [...template.targets, target],
      updatedAt: nowIso(),
    };
  });
}

export function saveCertificateFieldMapping(
  templateId: string,
  input: {
    targetId: string;
    dataFieldId: string;
    displayName?: string;
    required?: boolean;
  },
): CertificateTemplate {
  const field = getCertificateCatalogField(input.dataFieldId);
  if (!field) throw new Error("Choose a valid LumenX field");
  return mutateTemplateContent(templateId, (template) => {
    if (!template.targets.some((target) => target.id === input.targetId)) {
      throw new Error("Select a text box or target area first");
    }
    const mapping: CertificateFieldMapping = {
      targetId: input.targetId,
      dataFieldId: field.id,
      displayName: (input.displayName ?? field.displayName).trim() || field.displayName,
      required: input.required ?? field.defaultRequired,
    };
    const mappings = template.mappings.filter((item) => item.targetId !== input.targetId);
    mappings.push(mapping);
    return {
      ...template,
      mappings,
      updatedAt: nowIso(),
    };
  });
}

export function clearCertificateFieldMapping(
  templateId: string,
  targetId: string,
): CertificateTemplate {
  return mutateTemplateContent(templateId, (template) => ({
    ...template,
    mappings: template.mappings.filter((item) => item.targetId !== targetId),
    updatedAt: nowIso(),
  }));
}

export function subscribeCertificateCatalog(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === CERTIFICATE_CATALOG_STORAGE_KEY || event.key === null) {
      cachedRaw = null;
      cachedSnapshot = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CERTIFICATE_CATALOG_CHANGED_EVENT, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CERTIFICATE_CATALOG_CHANGED_EVENT, listener);
  };
}
