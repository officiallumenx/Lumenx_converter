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

export const NEXUS_TEMPLATES: RegisteredNotificationTemplate[] = [
  tpl({
    templateId: IDS.system.nexus.licenseRenewal,
    category: "nexus",
    audience: "admin",
    title: "License renewal",
    message: "Your {{plan}} license renews on {{renewalDate}}.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    description: "Platform notice to institute Admin about upcoming license renewal.",
    whereUsed: ["Nexus Billing", "Admin banner"],
    updatedAt: daysAgo(20),
  }),
  tpl({
    templateId: IDS.system.nexus.moduleEntitlement,
    category: "nexus",
    audience: "admin",
    title: "Module update",
    message: "{{moduleName}} is now {{state}} for your institute.",
    priority: "normal",
    status: "published",
    version: "1.0.2",
    description: "Inform institute when a module is enabled or disabled by Nexus.",
    whereUsed: ["Nexus Modules", "Admin Modules"],
    updatedAt: daysAgo(8),
  }),
];
