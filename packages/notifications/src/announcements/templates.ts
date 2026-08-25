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

export const ANNOUNCEMENTS_TEMPLATES: RegisteredNotificationTemplate[] = [
  tpl({
    templateId: IDS.announcements.audience.broadcast,
    category: "announcements",
    audience: "institute",
    title: "{{headline}}",
    message: "{{bodyPreview}}",
    priority: "normal",
    status: "published",
    version: "2.3.0",
    description: "Institute broadcast with audience, priority, optional link/attachment.",
    whereUsed: ["Admin Announcements", "Connect"],
    updatedAt: daysAgo(1),
    deepLink: "/notifications",
    allowedVariables: [
      "headline",
      "bodyPreview",
      "sender",
      "audience",
      "priority",
      "attachmentName",
    ],
  }),
];
