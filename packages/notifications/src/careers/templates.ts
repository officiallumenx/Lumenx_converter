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

export const CAREERS_TEMPLATES: RegisteredNotificationTemplate[] = [
  tpl({
    templateId: IDS.careers.student.applicationSubmitted,
    category: "careers",
    audience: "student",
    title: "Application submitted",
    message:
      "Your application {{applicationId}} for {{jobTitle}} at {{instituteName}} has been submitted.",
    priority: "success",
    status: "published",
    version: "1.0.0",
    description: "Confirm career application submission.",
    whereUsed: ["Admin Careers", "Connect"],
    updatedAt: daysAgo(30),
  }),
  tpl({
    templateId: IDS.careers.student.shortlisted,
    category: "careers",
    audience: "student",
    title: "Shortlisted",
    message: "You have been shortlisted for {{jobTitle}} at {{instituteName}} ({{applicationId}}).",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/careers/applications",
    whereUsed: ["Admin Careers", "Connect Careers"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.careers.student.interview,
    category: "careers",
    audience: "student",
    title: "Interview update",
    message: "{{jobTitle}} at {{instituteName}}: {{detail}} ({{applicationId}}).",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/careers/applications",
    whereUsed: ["Admin Careers", "Connect Careers"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.careers.student.selected,
    category: "careers",
    audience: "student",
    title: "Selected",
    message: "Congratulations — selected for {{jobTitle}} at {{instituteName}} ({{applicationId}}).",
    priority: "success",
    status: "published",
    version: "1.0.0",
    deepLink: "/careers/applications",
    whereUsed: ["Admin Careers", "Connect Careers"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.careers.student.rejected,
    category: "careers",
    audience: "student",
    title: "Application not selected",
    message: "{{jobTitle}} at {{instituteName}}: your application was not selected ({{applicationId}}).",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/careers/applications",
    whereUsed: ["Admin Careers", "Connect Careers"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.careers.student.onboarding,
    category: "careers",
    audience: "student",
    title: "Onboarding / joining update",
    message: "{{jobTitle}} at {{instituteName}}: {{detail}} ({{applicationId}}).",
    priority: "important",
    status: "published",
    version: "1.0.0",
    deepLink: "/careers/applications",
    whereUsed: ["Admin Careers", "Connect Careers"],
    updatedAt: daysAgo(1),
  }),
  tpl({
    templateId: IDS.careers.student.statusUpdate,
    category: "careers",
    audience: "student",
    title: "Application status update",
    message: "{{applicationId}} for {{jobTitle}} is now {{statusLabel}}.",
    priority: "normal",
    status: "published",
    version: "1.0.0",
    deepLink: "/careers/applications",
    whereUsed: ["Admin Careers", "Connect Careers"],
    updatedAt: daysAgo(1),
  }),
];
