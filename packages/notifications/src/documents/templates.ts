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

export const DOCUMENTS_TEMPLATES: RegisteredNotificationTemplate[] = [
  tpl({
    templateId: IDS.documents.requester.requestReceived,
    category: "documents",
    audience: "parent",
    title: "Document request received",
    message: "Request {{requestId}} for {{documentLabel}} was received.",
    priority: "normal",
    status: "published",
    version: "1.0.0",
    deepLink: "/documents",
    whereUsed: ["Admin Documents"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.documents.requester.requestApproved,
    category: "documents",
    audience: "parent",
    title: "Document request approved",
    message: "Request {{requestId}} ({{documentLabel}}) was approved.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/documents",
    whereUsed: ["Admin Documents"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.documents.requester.requestRejected,
    category: "documents",
    audience: "parent",
    title: "Document request rejected",
    message: "Request {{requestId}} ({{documentLabel}}) was rejected. Reason: {{reason}}",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/documents",
    whereUsed: ["Admin Documents"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.documents.requester.documentGenerated,
    category: "documents",
    audience: "parent",
    title: "Document generated",
    message: "{{documentLabel}} for {{studentName}} has been generated.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/documents",
    whereUsed: ["Admin Documents"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.documents.requester.documentReady,
    category: "documents",
    audience: "parent",
    title: "Document ready",
    message: "{{documentLabel}} for {{studentName}} is ready to download.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/documents",
    whereUsed: ["Admin Documents"],
    updatedAt: daysAgo(1),
  }),
];
