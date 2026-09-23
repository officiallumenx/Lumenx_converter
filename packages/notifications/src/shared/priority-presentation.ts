import type { AppNotification, NotificationCategory } from "@lumenx/types";
import type { LumenXNotificationPriority } from "./types";
import { escalatePriorityFromDueAt, type StoredNotificationPriority } from "./deadline-priority";

const BACKEND_TO_UI_CATEGORY: Record<string, NotificationCategory> = {
  attendance: "attendance",
  homework: "assignments",
  fees: "fees",
  exams: "exams",
  events: "events",
  transport: "circulars",
  leave: "circulars",
  announcements: "circulars",
  messages: "circulars",
  complaints: "circulars",
  admissions: "academic",
  careers: "circulars",
  certificates: "academic",
  documents: "academic",
  timetable: "academic",
  system: "circulars",
  nexus: "circulars",
};

export function backendCategoryToUiCategory(
  category: string | null | undefined,
): NotificationCategory {
  if (!category) return "circulars";
  return BACKEND_TO_UI_CATEGORY[category] ?? "circulars";
}

export function presentationFromPriority(priority: LumenXNotificationPriority | string | null | undefined): {
  type: AppNotification["type"];
  priority: NonNullable<AppNotification["priority"]>;
} {
  if (priority === "critical") return { type: "warning", priority: "high" };
  if (priority === "important") return { type: "warning", priority: "normal" };
  if (priority === "success") return { type: "positive", priority: "normal" };
  return { type: "info", priority: "normal" };
}

export function effectiveStoredPriority(input: {
  stored?: StoredNotificationPriority | null;
  dueAt?: string | null;
  now?: Date;
}): StoredNotificationPriority {
  return escalatePriorityFromDueAt(input.stored, input.dueAt, input.now);
}

/** Tailwind-oriented token names for inbox rows — use with existing LumenX tokens. */
export type NotificationToneToken = "primary" | "warning" | "destructive" | "success";

export function toneTokenFromPriority(
  priority: LumenXNotificationPriority | string | null | undefined,
): NotificationToneToken {
  if (priority === "critical") return "destructive";
  if (priority === "important") return "warning";
  if (priority === "success") return "success";
  return "primary";
}
