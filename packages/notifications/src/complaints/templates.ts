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

export const COMPLAINTS_TEMPLATES: RegisteredNotificationTemplate[] = [
  tpl({
    templateId: IDS.complaints.requester.submitted,
    category: "complaints",
    audience: "parent",
    title: "Complaint submitted",
    message: "Your complaint \"{{title}}\" ({{complaintId}}) was submitted.",
    priority: "normal",
    status: "published",
    version: "1.0.0",
    deepLink: "/complaints",
    whereUsed: ["Connect Complaints", "Admin Complaints"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.complaints.requester.received,
    category: "complaints",
    audience: "parent",
    title: "Complaint received",
    message: "We received your complaint \"{{title}}\" ({{complaintId}}).",
    priority: "normal",
    status: "published",
    version: "1.0.0",
    deepLink: "/complaints",
    whereUsed: ["Connect Complaints"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.complaints.requester.underReview,
    category: "complaints",
    audience: "parent",
    title: "Complaint under review",
    message: "\"{{title}}\" ({{complaintId}}) is now under review.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/complaints",
    whereUsed: ["Admin Complaints"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.complaints.requester.resolved,
    category: "complaints",
    audience: "parent",
    title: "Complaint resolved",
    message: "\"{{title}}\" ({{complaintId}}) has been resolved.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/complaints",
    whereUsed: ["Admin Complaints"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.complaints.requester.rejected,
    category: "complaints",
    audience: "parent",
    title: "Complaint rejected",
    message: "\"{{title}}\" ({{complaintId}}) was rejected. Reason: {{reason}}",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/complaints",
    whereUsed: ["Admin Complaints"],
    updatedAt: daysAgo(1),
  }),
];
