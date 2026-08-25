/**
 * Nexus Notification Template Catalog — platform management only.
 * Consumes `@lumenx/notifications` central registry (single SoT).
 * Not a visual designer. Not an Admin notification sender.
 * Does not create a second template database.
 */

import {
  LUMENX_NOTIFICATION_CATEGORIES,
  archiveRegisteredTemplate,
  draftRegisteredTemplate,
  listRegisteredTemplates,
  publishRegisteredTemplate,
  type LumenXNotificationCategory,
  type NotificationTemplateStatus,
  type RegisteredNotificationTemplate,
  type RegistryTemplateAudience,
} from "@lumenx/notifications";

/** UI filter categories = registry module categories. */
export type NotificationTemplateCategory = LumenXNotificationCategory;

/** Catalog statuses match the shared registry (no active/deprecated remap). */
export type CatalogTemplateStatus = NotificationTemplateStatus;

export type PlatformNotificationTemplate = {
  id: string;
  name: string;
  category: NotificationTemplateCategory;
  purpose: string;
  audience: RegistryTemplateAudience | "—";
  priority: string;
  allowedVariables: string[];
  /** Plain-text preview — not a live design canvas */
  previewTitle: string;
  previewBody: string;
  whereUsed: string[];
  version: string;
  status: CatalogTemplateStatus;
  updatedAt: string;
  deepLink?: string;
};

export const TEMPLATE_CATEGORIES: {
  id: NotificationTemplateCategory;
  label: string;
}[] = LUMENX_NOTIFICATION_CATEGORIES.map((id) => ({
  id,
  label: id[0]!.toUpperCase() + id.slice(1),
}));

function catalogName(t: RegisteredNotificationTemplate): string {
  const raw = t.title.replace(/\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g, "").replace(/\s*·\s*$/, "").trim();
  if (raw) return raw;
  return t.templateId;
}

function toPlatformTemplate(t: RegisteredNotificationTemplate): PlatformNotificationTemplate {
  return {
    id: t.templateId,
    name: catalogName(t),
    category: t.category,
    purpose: t.description ?? t.message,
    audience: t.audience ?? "—",
    priority: t.priority,
    allowedVariables: [...t.allowedVariables],
    previewTitle: t.title,
    previewBody: t.message,
    whereUsed: [...(t.whereUsed ?? [])],
    version: t.version,
    status: t.status,
    updatedAt: t.updatedAt ?? new Date(0).toISOString(),
    deepLink: t.deepLink,
  };
}

/**
 * Exclude generic fallback rows from the Nexus catalog (noise).
 * Explicit product templates only.
 */
function isCatalogVisible(t: RegisteredNotificationTemplate): boolean {
  return !t.templateId.endsWith(".generic_update");
}

/** Built from the shared registry — not a duplicate seed list. */
export function listCatalogTemplates(): PlatformNotificationTemplate[] {
  return listRegisteredTemplates()
    .filter(isCatalogVisible)
    .map(toPlatformTemplate)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getCatalogTemplate(id: string): PlatformNotificationTemplate | null {
  return listCatalogTemplates().find((t) => t.id === id) ?? null;
}

/** Refresh after registry status transitions. */
export function publishCatalogTemplate(id: string): PlatformNotificationTemplate | null {
  const row = publishRegisteredTemplate(id);
  return row ? toPlatformTemplate(row) : null;
}

export function archiveCatalogTemplate(id: string): PlatformNotificationTemplate | null {
  const row = archiveRegisteredTemplate(id);
  return row ? toPlatformTemplate(row) : null;
}

export function draftCatalogTemplate(id: string): PlatformNotificationTemplate | null {
  const row = draftRegisteredTemplate(id);
  return row ? toPlatformTemplate(row) : null;
}

/** @deprecated Prefer listCatalogTemplates(); kept for any direct imports. */
export const PLATFORM_NOTIFICATION_TEMPLATE_CATALOG: PlatformNotificationTemplate[] =
  listCatalogTemplates();

export function catalogStats(templates: PlatformNotificationTemplate[]) {
  return {
    total: templates.length,
    published: templates.filter((t) => t.status === "published").length,
    draft: templates.filter((t) => t.status === "draft").length,
    archived: templates.filter((t) => t.status === "archived").length,
    categories: TEMPLATE_CATEGORIES.length,
  };
}

export function labelCategory(c: NotificationTemplateCategory): string {
  return TEMPLATE_CATEGORIES.find((x) => x.id === c)?.label ?? c;
}

export function labelStatus(s: CatalogTemplateStatus): string {
  if (s === "published") return "Published";
  if (s === "draft") return "Draft";
  return "Archived";
}

export function labelAudience(a: PlatformNotificationTemplate["audience"]): string {
  if (a === "—") return "—";
  return a[0]!.toUpperCase() + a.slice(1);
}

export function statusTone(s: CatalogTemplateStatus): "success" | "warning" | "neutral" {
  if (s === "published") return "success";
  if (s === "draft") return "warning";
  return "neutral";
}

export function formatTemplateDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Prefill for Support Center request workflow. */
export function templateChangeRequestDraft(t: PlatformNotificationTemplate): {
  subject: string;
  body: string;
  category: "improvement_request";
} {
  return {
    category: "improvement_request",
    subject: `Template change request: ${t.name}`,
    body: [
      `Requesting a platform template update (Nexus catalog — not Admin send).`,
      ``,
      `Template ID: ${t.id}`,
      `Name: ${t.name}`,
      `Category: ${labelCategory(t.category)}`,
      `Audience: ${labelAudience(t.audience)}`,
      `Priority: ${t.priority}`,
      `Version: ${t.version}`,
      `Status: ${labelStatus(t.status)}`,
      `Deep link: ${t.deepLink ?? "—"}`,
      `Variables: ${t.allowedVariables.join(", ") || "—"}`,
      ``,
      `Requested change:`,
      `(describe the copy / audience / channel change — design is owned outside this UI)`,
    ].join("\n"),
  };
}
