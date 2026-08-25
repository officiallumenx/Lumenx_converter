import type { LumenXNotificationCategory } from "../types";
import type {
  NotificationAudience,
  NotificationFeature,
  RegisteredNotificationTemplate,
} from "./types";
import { extractAllowedVariables } from "./variables";
import { DEFAULT_DEEP_LINK } from "./legacy-map";

const LEGACY_FEATURES: NotificationFeature[] = [
  "admissions",
  "attendance",
  "fees",
  "transport",
  "events",
  "messages",
  "careers",
];

const LEGACY_AUDIENCES: NotificationAudience[] = [
  "parent",
  "student",
  "teacher",
  "institute",
  "admin",
];

function featureCategory(feature: NotificationFeature): LumenXNotificationCategory {
  return feature;
}

/** Generic fallback templates (same IDs as prior module-notifications). */
export function buildGenericTemplates(): RegisteredNotificationTemplate[] {
  return LEGACY_FEATURES.flatMap((feature) =>
    LEGACY_AUDIENCES.map((audience) => {
      const title = `${feature[0]!.toUpperCase()}${feature.slice(1)} update`;
      const message = "{{message}}";
      const category = featureCategory(feature);
      return {
        templateId: `${feature}.${audience}.generic_update`,
        category,
        audience,
        title,
        message,
        priority: "normal" as const,
        allowedVariables: extractAllowedVariables(title, message),
        deepLink: DEFAULT_DEEP_LINK[category],
        status: "published" as const,
        version: "1.0.0",
        description: "Generic fallback notification template.",
        whereUsed: ["Admin Notification Center"],
      };
    }),
  );
}
