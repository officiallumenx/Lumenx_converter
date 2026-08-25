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

export const EVENTS_TEMPLATES: RegisteredNotificationTemplate[] = [
  tpl({
    templateId: IDS.events.audience.published,
    category: "events",
    audience: "institute",
    title: "{{title}}",
    message: "{{when}} · {{venue}} · {{descriptionPreview}}",
    priority: "normal",
    status: "published",
    version: "1.0.0",
    deepLink: "/events",
    whereUsed: ["Admin Events", "Connect"],
    updatedAt: daysAgo(1),
    allowedVariables: [
      "title",
      "when",
      "venue",
      "descriptionPreview",
      "category",
      "audience",
    ],
  }),
  tpl({
    templateId: IDS.events.audience.reminder1d,
    category: "events",
    audience: "institute",
    title: "Tomorrow: {{title}}",
    message: "{{when}} · {{venue}}",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/events",
    whereUsed: ["Admin Events"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.events.audience.reminder1h,
    category: "events",
    audience: "institute",
    title: "In 1 hour: {{title}}",
    message: "{{when}} · {{venue}}",
    priority: "critical",
    status: "published",
    version: "1.0.0",
    deepLink: "/events",
    whereUsed: ["Admin Events"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.events.audience.changed,
    category: "events",
    audience: "institute",
    title: "Event updated: {{title}}",
    message: "{{changeSummary}} · {{when}} · {{venue}}",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/events",
    whereUsed: ["Admin Events"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.events.audience.cancelled,
    category: "events",
    audience: "institute",
    title: "Event cancelled: {{title}}",
    message: "{{cancellationReason}}",
    priority: "critical",
    status: "published",
    version: "1.0.0",
    deepLink: "/events",
    whereUsed: ["Admin Events"],
    updatedAt: daysAgo(1),
  }),
];
