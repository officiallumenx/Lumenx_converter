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

export const LEAVE_TEMPLATES: RegisteredNotificationTemplate[] = [
  tpl({
    templateId: IDS.leave.teacher.diaryReminder,
    category: "leave",
    audience: "teacher",
    title: "Diary pending",
    message: "Class diary for {{classSection}} on {{date}} is incomplete.",
    priority: "normal",
    status: "draft",
    version: "0.9.0",
    description: "Remind teachers to complete class diary entries.",
    whereUsed: ["Admin Diary", "Teacher portal"],
    updatedAt: daysAgo(3),
  }),
  tpl({
    templateId: IDS.leave.teacher.studentRequest,
    category: "leave",
    audience: "teacher",
    title: "Leave request — {{studentName}}",
    message: "{{dateRange}} · {{reasonPreview}}",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/leave",
    whereUsed: ["Connect leave", "Teacher portal"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.leave.teacher.pending,
    category: "leave",
    audience: "teacher",
    title: "Leave request pending",
    message: "Your leave ({{dateRange}}) is pending {{reviewer}} review.",
    priority: "normal",
    status: "published",
    version: "1.0.0",
    deepLink: "/leave",
    whereUsed: ["Teacher portal"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.leave.teacher.decision,
    category: "leave",
    audience: "teacher",
    title: "Leave {{decisionLabel}}",
    message: "{{dateRange}}. {{reasonSuffix}}",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/leave",
    whereUsed: ["Admin Leave", "Teacher portal"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.leave.parent.pending,
    category: "leave",
    audience: "parent",
    title: "Leave request submitted",
    message: "{{studentName}} · {{dateRange}} is pending teacher review.",
    priority: "normal",
    status: "published",
    version: "1.0.0",
    deepLink: "/leave",
    whereUsed: ["Connect parent"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.leave.parent.decision,
    category: "leave",
    audience: "parent",
    title: "Leave {{decisionLabel}}",
    message: "{{studentName}} · {{dateRange}}. {{reasonSuffix}}",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/leave",
    whereUsed: ["Connect leave"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.leave.admin.teacherRequest,
    category: "leave",
    audience: "admin",
    title: "Teacher leave — {{teacherName}}",
    message: "{{leaveType}} · {{dateRange}} · {{reasonPreview}}",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/leave",
    whereUsed: ["Admin Leave", "Teacher portal"],
    updatedAt: daysAgo(1),
  }),
];
