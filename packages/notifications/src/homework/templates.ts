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

export const HOMEWORK_TEMPLATES: RegisteredNotificationTemplate[] = [
  tpl({
    templateId: IDS.homework.student.assigned,
    category: "homework",
    audience: "student",
    title: "New homework",
    message: "{{subject}}: {{title}} due {{dueDate}}.",
    priority: "normal",
    status: "published",
    version: "1.3.2",
    description: "Notify students of new homework.",
    whereUsed: ["Connect teacher", "Connect student"],
    updatedAt: daysAgo(21),
    deepLink: "/homework",
  }),
  tpl({
    templateId: IDS.homework.parent.assigned,
    category: "homework",
    audience: "parent",
    title: "New homework assigned",
    message: "{{studentName}}: {{subject}} — {{title}} due {{dueDate}}.",
    priority: "normal",
    status: "published",
    version: "1.0.0",
    deepLink: "/homework",
    whereUsed: ["Connect teacher", "Connect parent"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.homework.parent.reminder,
    category: "homework",
    audience: "parent",
    title: "Homework reminder",
    message: "{{studentName}} has homework due {{dueDate}} ({{subject}}).",
    priority: "important",
    status: "published",
    version: "1.0.4",
    description: "Remind parents about upcoming homework deadlines.",
    whereUsed: ["Connect parent"],
    updatedAt: daysAgo(33),
    deepLink: "/homework",
  }),
  tpl({
    templateId: IDS.homework.student.reminder,
    category: "homework",
    audience: "student",
    title: "Homework reminder",
    message: "{{subject}}: {{title}} is due {{dueDate}}.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/homework",
    whereUsed: ["Connect student"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.homework.parent.submitted,
    category: "homework",
    audience: "parent",
    title: "Homework submitted",
    message: "{{studentName}} submitted {{subject}}: {{title}}.",
    priority: "success",
    status: "published",
    version: "1.0.0",
    deepLink: "/homework",
    whereUsed: ["Connect teacher", "Connect parent"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.homework.parent.notSubmitted,
    category: "homework",
    audience: "parent",
    title: "Homework not submitted",
    message: "{{studentName}} has not submitted {{subject}}: {{title}} (due {{dueDate}}).",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/homework",
    whereUsed: ["Connect teacher", "Connect parent"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.homework.parent.duePassed,
    category: "homework",
    audience: "parent",
    title: "Homework overdue",
    message: "{{studentName}}: {{subject}} — {{title}} was due {{dueDate}}.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/homework",
    whereUsed: ["Connect parent"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.homework.student.duePassed,
    category: "homework",
    audience: "student",
    title: "Homework overdue",
    message: "{{subject}}: {{title}} was due {{dueDate}}.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/homework",
    whereUsed: ["Connect student"],
    updatedAt: daysAgo(1),
  }),
];
