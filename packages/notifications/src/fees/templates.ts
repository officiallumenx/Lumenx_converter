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

export const FEES_TEMPLATES: RegisteredNotificationTemplate[] = [
  tpl({
    templateId: IDS.fees.parent.feeAdded,
    category: "fees",
    audience: "parent",
    title: "Fee added",
    message: "{{feeLabel}} ({{amount}}) has been added for {{studentName}}.",
    priority: "normal",
    status: "published",
    version: "1.0.0",
    deepLink: "/fees",
    whereUsed: ["Admin Fees", "Connect parent"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.fees.parent.feeDue,
    category: "fees",
    audience: "parent",
    title: "Fee due",
    message: "{{feeLabel}} of {{amount}} is due by {{dueDate}}.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/fees",
    whereUsed: ["Admin Fees", "Connect parent"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.fees.parent.dueReminder,
    category: "fees",
    audience: "parent",
    title: "Fee reminder",
    message: "{{feeLabel}} of {{amount}} is due by {{dueDate}}.",
    priority: "important",
    status: "published",
    version: "3.1.0",
    description: "Remind parents of upcoming fee installments.",
    whereUsed: ["Admin Fees", "Connect parent"],
    updatedAt: daysAgo(5),
    deepLink: "/fees",
  }),
  tpl({
    templateId: IDS.fees.parent.overdue,
    category: "fees",
    audience: "parent",
    title: "Fee overdue",
    message: "{{feeLabel}} of {{amount}} was due {{dueDate}} and is overdue.",
    priority: "critical",
    status: "published",
    version: "1.0.0",
    deepLink: "/fees",
    whereUsed: ["Admin Fees", "Connect parent"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.fees.parent.paymentReceived,
    category: "fees",
    audience: "parent",
    title: "Payment received",
    message: "We received {{amount}} for {{feeLabel}} ({{receiptId}}).",
    priority: "success",
    status: "published",
    version: "3.0.2",
    description: "Acknowledge successful offline fee payment.",
    whereUsed: ["Admin Fees", "Connect parent"],
    updatedAt: daysAgo(14),
    deepLink: "/fees",
  }),
  tpl({
    templateId: IDS.fees.parent.receiptAvailable,
    category: "fees",
    audience: "parent",
    title: "Receipt available",
    message: "Receipt {{receiptId}} for {{feeLabel}} ({{amount}}) is ready.",
    priority: "success",
    status: "published",
    version: "1.0.0",
    deepLink: "/fees",
    whereUsed: ["Admin Fees", "Connect parent"],
    updatedAt: daysAgo(1),
  }),
];
