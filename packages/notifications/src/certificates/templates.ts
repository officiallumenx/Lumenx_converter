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

export const CERTIFICATES_TEMPLATES: RegisteredNotificationTemplate[] = [
  tpl({
    templateId: IDS.certificates.recipient.issued,
    category: "certificates",
    audience: "student",
    title: "Certificate issued",
    message: "{{certificateName}} was issued{{numberPart}}.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/certificates",
    whereUsed: ["Admin Certificates"],
    updatedAt: daysAgo(1),
    allowedVariables: ["certificateName", "numberPart", "studentName", "certificateId"],
  }),
  tpl({
    templateId: IDS.certificates.recipient.published,
    category: "certificates",
    audience: "student",
    title: "Certificate published",
    message: "{{certificateName}} is now available for {{studentName}}.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/certificates",
    whereUsed: ["Admin Certificates"],
    updatedAt: daysAgo(1),
  }),
];
