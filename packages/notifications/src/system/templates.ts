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

export const SYSTEM_TEMPLATES: RegisteredNotificationTemplate[] = [
  tpl({
    templateId: IDS.system.institute.opsCritical,
    category: "system",
    audience: "institute",
    title: "Alert: {{title}}",
    message: "{{message}}",
    priority: "critical",
    status: "published",
    version: "1.0.0",
    description: "Push critical institute operational alerts to configured audiences.",
    whereUsed: ["Admin Alerts", "Connect"],
    updatedAt: daysAgo(28),
  }),
  tpl({
    templateId: IDS.system.institute.securityEvent,
    category: "system",
    audience: "admin",
    title: "Security event",
    message: "{{message}}",
    priority: "critical",
    status: "published",
    version: "1.0.0",
    deepLink: "/notifications",
    whereUsed: ["Admin Auth", "Admin Alerts"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.system.institute.accountSecurityChange,
    category: "system",
    audience: "admin",
    title: "Security setting updated",
    message: "{{message}}",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/notifications",
    whereUsed: ["Admin Auth"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.system.institute.maintenance,
    category: "system",
    audience: "institute",
    title: "Maintenance: {{title}}",
    message: "{{message}}",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/notifications",
    whereUsed: ["Admin Alerts"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.system.institute.systemWarning,
    category: "system",
    audience: "institute",
    title: "System warning: {{title}}",
    message: "{{message}}",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/notifications",
    whereUsed: ["Admin Alerts"],
    updatedAt: daysAgo(1),
  }),
];
