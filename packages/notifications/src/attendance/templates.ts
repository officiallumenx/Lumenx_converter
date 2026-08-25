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
  const allowedVariables =
    partial.allowedVariables ?? extractAllowedVariables(partial.title, partial.message);
  return {
    ...partial,
    allowedVariables,
    deepLink: partial.deepLink ?? DEFAULT_DEEP_LINK[partial.category],
  };
}

export const ATTENDANCE_TEMPLATES: RegisteredNotificationTemplate[] = [
  tpl({
    templateId: IDS.attendance.parent.dailyAbsence,
    category: "attendance",
    audience: "parent",
    title: "Absence recorded · {{studentName}}",
    message:
      "{{studentName}} was marked absent ({{slotLabel}}) on {{date}} for class {{classLabel}}-{{section}}.",
    priority: "important",
    status: "published",
    version: "1.4.0",
    description: "Notify guardian when a student is marked absent for the day.",
    whereUsed: ["Admin Attendance", "Connect parent feed"],
    updatedAt: daysAgo(12),
  }),
  tpl({
    templateId: IDS.attendance.parent.periodAbsence,
    category: "attendance",
    audience: "parent",
    title: "Period absence · {{studentName}}",
    message:
      "{{studentName}} was marked absent for {{slotLabel}} on {{date}} ({{classLabel}}-{{section}}).",
    priority: "important",
    status: "published",
    version: "1.0.0",
    description: "Notify guardian of a period-level absence.",
    whereUsed: ["Admin Attendance", "Connect parent"],
    updatedAt: daysAgo(12),
  }),
  tpl({
    templateId: IDS.attendance.parent.dailySummary,
    category: "attendance",
    audience: "parent",
    title: "Attendance summary · {{studentName}}",
    message: "{{studentName}} has {{count}} attendance alert(s) on {{date}}.",
    priority: "normal",
    status: "published",
    version: "1.1.0",
    description: "End-of-day attendance rollup for parents.",
    whereUsed: ["Admin Attendance reports", "Connect parent"],
    updatedAt: daysAgo(40),
  }),
  tpl({
    templateId: IDS.attendance.student.dailyAbsence,
    category: "attendance",
    audience: "student",
    title: "Absence recorded · {{studentName}}",
    message:
      "You were marked absent ({{slotLabel}}) on {{date}} for class {{classLabel}}-{{section}}.",
    priority: "important",
    status: "published",
    version: "1.2.0",
    description: "Notify the student app of a recorded daily absence.",
    whereUsed: ["Connect student"],
    updatedAt: daysAgo(18),
  }),
  tpl({
    templateId: IDS.attendance.student.periodAbsence,
    category: "attendance",
    audience: "student",
    title: "Period absence · {{studentName}}",
    message:
      "You were marked absent for {{slotLabel}} on {{date}} ({{classLabel}}-{{section}}).",
    priority: "important",
    status: "published",
    version: "1.0.0",
    description: "Notify the student of a period-level absence.",
    whereUsed: ["Connect student"],
    updatedAt: daysAgo(18),
  }),
  tpl({
    templateId: IDS.attendance.student.dailySummary,
    category: "attendance",
    audience: "student",
    title: "Attendance summary · {{studentName}}",
    message: "You have {{count}} attendance alert(s) on {{date}}.",
    priority: "normal",
    status: "published",
    version: "1.0.0",
    description: "End-of-day attendance rollup for students.",
    whereUsed: ["Connect student"],
    updatedAt: daysAgo(40),
  }),
  tpl({
    templateId: IDS.attendance.parent.percentageWarning,
    category: "attendance",
    audience: "parent",
    title: "Attendance below {{thresholdPct}}% · {{studentName}}",
    message:
      "{{studentName}}’s attendance is {{attendancePct}}% (threshold {{thresholdPct}}%). Open Attendance for details.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    description: "Warn parents when attendance falls below the configured threshold.",
    whereUsed: ["Admin Alerts", "Connect parent"],
    deepLink: "/attendance",
    updatedAt: daysAgo(5),
  }),
  tpl({
    templateId: IDS.attendance.student.percentageInfo,
    category: "attendance",
    audience: "student",
    title: "Your attendance is {{attendancePct}}%",
    message:
      "Your attendance is {{attendancePct}}% (school threshold {{thresholdPct}}%). Review Attendance for details.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    description: "Inform students of their attendance percentage (not an absence alert).",
    whereUsed: ["Connect student"],
    deepLink: "/attendance",
    updatedAt: daysAgo(5),
  }),
  tpl({
    templateId: IDS.attendance.teacher.pendingSubmit,
    category: "attendance",
    audience: "teacher",
    title: "Attendance not submitted",
    message:
      "Please submit today’s class attendance ({{pendingCount}} class{{pendingPlural}} waiting). Open Attendance to continue.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    description: "Remind teachers who have not submitted today’s attendance.",
    whereUsed: ["Admin Attendance Monitor", "Connect teacher"],
    deepLink: "/attendance",
    updatedAt: daysAgo(2),
  }),
  tpl({
    templateId: IDS.attendance.admin.pendingSubmit,
    category: "attendance",
    audience: "admin",
    title: "Attendance not submitted",
    message:
      "Reminders sent to {{teacherCount}} teacher{{teacherPlural}} for {{pendingCount}} pending class{{pendingPlural}}.",
    priority: "important",
    status: "published",
    version: "1.0.0",
    description: "Admin copy when pending-attendance reminders are sent.",
    whereUsed: ["Admin Notification Center"],
    deepLink: "/attendance",
    updatedAt: daysAgo(2),
  }),
];
