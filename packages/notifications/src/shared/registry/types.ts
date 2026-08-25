import type { LumenXNotificationCategory, LumenXNotificationPriority } from "../types";

/** Template lifecycle in the central registry. */
export type NotificationTemplateStatus = "draft" | "published" | "archived";

/**
 * Audience retained for legacy render compatibility (`NotificationAudience`).
 * Not required by the Phase 2 field list but needed so existing callers keep working.
 */
export type RegistryTemplateAudience =
  | "parent"
  | "student"
  | "teacher"
  | "institute"
  | "admin"
  | "driver";

/**
 * Central notification template record (source of truth).
 * Certificate/document *issuing* templates remain outside this registry.
 */
export type RegisteredNotificationTemplate = {
  templateId: string;
  category: LumenXNotificationCategory;
  title: string;
  message: string;
  priority: LumenXNotificationPriority;
  allowedVariables: readonly string[];
  /** In-app deep link path used at send time. */
  deepLink?: string;
  status: NotificationTemplateStatus;
  /**
   * Semver-ish version string. At most one `published` entry may exist
   * per `templateId` in the registry.
   */
  version: string;
  /** Optional catalog description (Nexus preview purpose). */
  description?: string;
  /** Optional “where used” hints for catalog display. */
  whereUsed?: readonly string[];
  /** ISO timestamp for catalog “updated” display. */
  updatedAt?: string;
  /** Legacy audience for renderNotificationTemplate compatibility. */
  audience?: RegistryTemplateAudience;
};

export type RenderVariables = Record<string, string | number | boolean | null | undefined>;

/** Legacy feature set used by Admin generic templates / FEATURE_HREF maps. */
export type NotificationFeature =
  | "admissions"
  | "attendance"
  | "fees"
  | "transport"
  | "events"
  | "messages"
  | "careers";

export type NotificationAudience =
  | "parent"
  | "student"
  | "teacher"
  | "institute"
  | "admin";

/** Legacy shape returned by `@lumenx/module-notifications` APIs. */
export type NotificationTemplate = {
  id: string;
  feature: NotificationFeature;
  audience: NotificationAudience;
  title: string;
  body: string;
  description?: string;
};

export type NotificationTemplateRender = {
  id: string;
  feature: NotificationFeature;
  audience: NotificationAudience;
  title: string;
  body: string;
};
