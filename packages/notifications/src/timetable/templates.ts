import type { RegisteredNotificationTemplate } from "../shared/registry/types";
import { NOTIFICATION_TEMPLATE_IDS as IDS } from "../shared/registry/ids";
import { extractAllowedVariables } from "../shared/registry/variables";
import { DEFAULT_DEEP_LINK } from "../shared/registry/legacy-map";

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function tpl(
  partial: Omit<RegisteredNotificationTemplate, "allowedVariables" | "deepLink"> & {
    allowedVariables?: readonly string[];
    deepLink?: string;
  },
): RegisteredNotificationTemplate {
  return {
    ...partial,
    allowedVariables:
      partial.allowedVariables ?? extractAllowedVariables(partial.title, partial.message),
    deepLink: partial.deepLink ?? DEFAULT_DEEP_LINK[partial.category],
  };
}

export const TIMETABLE_TEMPLATES: RegisteredNotificationTemplate[] = [
  tpl({
    templateId: IDS.timetable.audience.published,
    category: "timetable",
    audience: "institute",
    title: "Timetable published",
    message: "{{classLabel}} timetable is now live ({{termLabel}}).",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/timetable",
    whereUsed: ["Admin Timetable", "Connect"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.timetable.audience.changed,
    category: "timetable",
    audience: "institute",
    title: "Timetable updated",
    message: "{{classLabel}}: {{changeSummary}}.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/timetable",
    whereUsed: ["Admin Timetable"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.timetable.audience.importantChange,
    category: "timetable",
    audience: "institute",
    title: "Important timetable change",
    message: "{{classLabel}}: {{changeSummary}}.",
    priority: "critical",
    status: "published",
    version: "1.0.0",
    deepLink: "/timetable",
    whereUsed: ["Admin Timetable"],
    updatedAt: daysAgo(1),
  }),
];
