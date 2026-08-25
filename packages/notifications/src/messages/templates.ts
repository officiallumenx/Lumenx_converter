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

export const MESSAGES_TEMPLATES: RegisteredNotificationTemplate[] = [
  tpl({
    templateId: IDS.messages.student.welcome,
    category: "messages",
    audience: "student",
    title: "Welcome to {{instituteName}}",
    message: "Your student account is ready. Open Connect to get started.",
    priority: "success",
    status: "published",
    version: "1.0.1",
    description: "Welcome message when a student Connect account is activated.",
    whereUsed: ["Connect student onboarding"],
    updatedAt: daysAgo(60),
  }),
  tpl({
    templateId: IDS.messages.parent.linked,
    category: "messages",
    audience: "parent",
    title: "Account linked",
    message: "Your parent account is linked for {{studentName}}.",
    priority: "success",
    status: "published",
    version: "1.1.0",
    description: "Confirm guardian account linked to a student profile.",
    whereUsed: ["Connect parent", "Admin Parents"],
    updatedAt: daysAgo(45),
  }),
  tpl({
    templateId: IDS.messages.student.newMessage,
    category: "messages",
    audience: "student",
    title: "New message from {{senderName}}",
    message: "{{subjectPreview}}",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/messages",
    description: "Pointer notification for a new DM (body stays in messages store).",
    whereUsed: ["Connect messages"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.messages.parent.newMessage,
    category: "messages",
    audience: "parent",
    title: "New message from {{senderName}}",
    message: "{{subjectPreview}}",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/messages",
    description: "Pointer notification for a new DM (body stays in messages store).",
    whereUsed: ["Connect messages"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.messages.teacher.newMessage,
    category: "messages",
    audience: "teacher",
    title: "New message from {{senderName}}",
    message: "{{subjectPreview}}",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/messages",
    description: "Pointer notification for a new DM (body stays in messages store).",
    whereUsed: ["Connect teacher messages"],
    updatedAt: daysAgo(1),
  }),
];
