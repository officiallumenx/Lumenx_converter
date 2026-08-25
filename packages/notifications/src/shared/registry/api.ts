import type { LumenXNotificationCategory } from "../types";
import { ADMISSIONS_TEMPLATES } from "../../admissions/templates";
import { ANNOUNCEMENTS_TEMPLATES } from "../../announcements/templates";
import { ATTENDANCE_TEMPLATES } from "../../attendance/templates";
import { CAREERS_TEMPLATES } from "../../careers/templates";
import { CERTIFICATES_TEMPLATES } from "../../certificates/templates";
import { COMPLAINTS_TEMPLATES } from "../../complaints/templates";
import { DOCUMENTS_TEMPLATES } from "../../documents/templates";
import { EVENTS_TEMPLATES } from "../../events/templates";
import { EXAMS_TEMPLATES } from "../../exams/templates";
import { FEES_TEMPLATES } from "../../fees/templates";
import { HOMEWORK_TEMPLATES } from "../../homework/templates";
import { LEAVE_TEMPLATES } from "../../leave/templates";
import { MESSAGES_TEMPLATES } from "../../messages/templates";
import { NEXUS_TEMPLATES } from "../../nexus/templates";
import { SYSTEM_TEMPLATES } from "../../system/templates";
import { TIMETABLE_TEMPLATES } from "../../timetable/templates";
import { TRANSPORT_TEMPLATES } from "../../transport/templates";
import { buildGenericTemplates } from "./generics";
import type {
  NotificationAudience,
  NotificationFeature,
  NotificationTemplate,
  NotificationTemplateRender,
  RegisteredNotificationTemplate,
  RenderVariables,
} from "./types";
import { categoryToLegacyFeature, toLegacyAudience } from "./legacy-map";
import { interpolateTemplate } from "./variables";

const SEED: RegisteredNotificationTemplate[] = [
  ...ATTENDANCE_TEMPLATES,
  ...HOMEWORK_TEMPLATES,
  ...FEES_TEMPLATES,
  ...EXAMS_TEMPLATES,
  ...EVENTS_TEMPLATES,
  ...TRANSPORT_TEMPLATES,
  ...LEAVE_TEMPLATES,
  ...ANNOUNCEMENTS_TEMPLATES,
  ...MESSAGES_TEMPLATES,
  ...COMPLAINTS_TEMPLATES,
  ...ADMISSIONS_TEMPLATES,
  ...CAREERS_TEMPLATES,
  ...CERTIFICATES_TEMPLATES,
  ...DOCUMENTS_TEMPLATES,
  ...TIMETABLE_TEMPLATES,
  ...SYSTEM_TEMPLATES,
  ...NEXUS_TEMPLATES,
  ...buildGenericTemplates(),
];

/**
 * Enforce: at most one published version per templateId.
 * Throws in development/tests if the seed is invalid.
 */
export function assertSinglePublishedVersion(
  templates: readonly RegisteredNotificationTemplate[],
): void {
  const published = new Map<string, string>();
  for (const t of templates) {
    if (t.status !== "published") continue;
    const prev = published.get(t.templateId);
    if (prev !== undefined) {
      throw new Error(
        `NOTIFICATION_REGISTRY_DUPLICATE_PUBLISHED:${t.templateId} versions ${prev} and ${t.version}`,
      );
    }
    published.set(t.templateId, t.version);
  }
}

assertSinglePublishedVersion(SEED);

/** Mutable working set — seed + in-memory status transitions (demo; no backend). */
let working: RegisteredNotificationTemplate[] = SEED.map((t) => ({ ...t }));

function rebuildIndex(): void {
  byId.clear();
  for (const t of working) {
    const list = byId.get(t.templateId) ?? [];
    list.push(t);
    byId.set(t.templateId, list);
  }
}

/** Index: templateId → all versions (seed currently one row per id). */
const byId = new Map<string, RegisteredNotificationTemplate[]>();
rebuildIndex();

function bumpVersion(version: string): string {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!m) return `${version}.1`;
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}

export function listRegisteredTemplates(input?: {
  category?: LumenXNotificationCategory;
  status?: RegisteredNotificationTemplate["status"];
}): RegisteredNotificationTemplate[] {
  let all = [...working];
  if (input?.category) all = all.filter((t) => t.category === input.category);
  if (input?.status) all = all.filter((t) => t.status === input.status);
  return all;
}

/** Prefer the published version; otherwise any matching id (for catalog preview). */
export function getRegisteredTemplate(
  templateId: string,
): RegisteredNotificationTemplate | null {
  const versions = byId.get(templateId);
  if (!versions?.length) return null;
  return versions.find((t) => t.status === "published") ?? versions[0] ?? null;
}

/** Active published template only (send path). */
export function getPublishedTemplate(
  templateId: string,
): RegisteredNotificationTemplate | null {
  const versions = byId.get(templateId);
  if (!versions?.length) return null;
  return versions.find((t) => t.status === "published") ?? null;
}

export function toLegacyNotificationTemplate(
  t: RegisteredNotificationTemplate,
): NotificationTemplate {
  return {
    id: t.templateId,
    feature: categoryToLegacyFeature(t.category),
    audience: toLegacyAudience(t.audience),
    title: t.title,
    body: t.message,
    description: t.description,
  };
}

export function getNotificationTemplateById(templateId: string): NotificationTemplate | null {
  // Include draft/archived for catalog lookup; send path uses getPublishedTemplate.
  const t = getRegisteredTemplate(templateId);
  return t ? toLegacyNotificationTemplate(t) : null;
}

export function listNotificationTemplates(input?: {
  feature?: NotificationFeature;
  audience?: NotificationAudience;
}): NotificationTemplate[] {
  return listRegisteredTemplates()
    .filter((t) => {
      if (input?.feature && categoryToLegacyFeature(t.category) !== input.feature) return false;
      if (input?.audience && toLegacyAudience(t.audience) !== input.audience) return false;
      return true;
    })
    .map(toLegacyNotificationTemplate);
}

/**
 * Render a published template (falls back to any registered row so demos of
 * draft catalog entries can still preview copy without a separate editor).
 * Preserves the historical `renderNotificationTemplate` contract.
 */
export function renderNotificationTemplate(input: {
  templateId: string;
  variables?: RenderVariables;
}): NotificationTemplateRender {
  const registered =
    getPublishedTemplate(input.templateId) ?? getRegisteredTemplate(input.templateId);
  if (!registered) {
    throw new Error(`NOTIFICATION_TEMPLATE_NOT_FOUND:${input.templateId}`);
  }
  const template = toLegacyNotificationTemplate(registered);
  return {
    id: template.id,
    feature: template.feature,
    audience: template.audience,
    title: interpolateTemplate(template.title, input.variables),
    body: interpolateTemplate(template.body, input.variables),
  };
}

export function getGenericNotificationTemplateId(
  feature: NotificationFeature,
  audience: NotificationAudience,
): string {
  return `${feature}.${audience}.generic_update`;
}

export function getTemplateDeepLink(templateId: string): string | undefined {
  return getRegisteredTemplate(templateId)?.deepLink;
}

/**
 * Publish a draft template. Archives any other published row with the same
 * templateId so only one published version remains active.
 */
export function publishRegisteredTemplate(
  templateId: string,
): RegisteredNotificationTemplate | null {
  const idx = working.findIndex((t) => t.templateId === templateId && t.status === "draft");
  const anyIdx = idx >= 0 ? idx : working.findIndex((t) => t.templateId === templateId);
  if (anyIdx < 0) return null;
  const now = new Date().toISOString();
  working = working.map((t, i) => {
    if (t.templateId === templateId && t.status === "published" && i !== anyIdx) {
      return { ...t, status: "archived" as const, updatedAt: now };
    }
    if (i === anyIdx) {
      return {
        ...t,
        status: "published" as const,
        updatedAt: now,
        version: t.status === "published" ? t.version : bumpVersion(t.version),
      };
    }
    return t;
  });
  assertSinglePublishedVersion(working);
  rebuildIndex();
  return getPublishedTemplate(templateId);
}

/** Archive a published (or draft) template — remove from send path. */
export function archiveRegisteredTemplate(
  templateId: string,
): RegisteredNotificationTemplate | null {
  const idx = working.findIndex((t) => t.templateId === templateId);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  working = working.map((t, i) =>
    i === idx ? { ...t, status: "archived" as const, updatedAt: now } : t,
  );
  rebuildIndex();
  return working[idx] ?? null;
}

/** Move archived/published back to draft for rework (still not sendable). */
export function draftRegisteredTemplate(
  templateId: string,
): RegisteredNotificationTemplate | null {
  const idx = working.findIndex((t) => t.templateId === templateId);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  working = working.map((t, i) =>
    i === idx ? { ...t, status: "draft" as const, updatedAt: now } : t,
  );
  rebuildIndex();
  return working[idx] ?? null;
}

/** Test helper — reset working set to seed. */
export function resetRegisteredTemplatesForTests(): void {
  working = SEED.map((t) => ({ ...t }));
  rebuildIndex();
}
