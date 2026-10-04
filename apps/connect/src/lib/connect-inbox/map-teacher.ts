import type { AppNotification } from "@lumenx/types";
import { isAlertNotification } from "@lumenx/notifications";
import type { TeacherNotification } from "@/lib/teacher/types";

const TEACHER_CATEGORIES = new Set<TeacherNotification["category"]>([
  "announcements",
  "events",
  "exam_updates",
  "staff_notices",
  "messages",
  "system",
  "urgent",
  "transport",
  "leave",
  "homework",
]);

function haystack(notification: AppNotification): string {
  const payload = notification.payload ?? {};
  return [
    notification.title,
    notification.desc,
    notification.templateId,
    typeof payload.kind === "string" ? payload.kind : "",
    typeof payload.entityType === "string" ? payload.entityType : "",
  ]
    .join(" ")
    .toLowerCase();
}

function isSosOrEmergency(notification: AppNotification, text: string): boolean {
  if (notification.category === "emergency") return true;
  if (/\b(sos|evacuation|lockdown)\b/.test(text)) return true;
  return false;
}

function toTeacherCategory(
  category: AppNotification["category"] | string | null | undefined,
): TeacherNotification["category"] {
  if (category === "circulars" || category === "announcements") return "announcements";
  if (category === "events") return "events";
  if (category === "exams") return "exam_updates";
  if (category === "emergency") return "urgent";
  if (category === "transport") return "transport";
  if (category === "leave") return "leave";
  if (category === "assignments") return "homework";
  if (category === "fees" || category === "academic") return "staff_notices";
  if (category === "messages") return "messages";
  if (category === "system") return "system";
  if (category && TEACHER_CATEGORIES.has(category as TeacherNotification["category"])) {
    return category as TeacherNotification["category"];
  }
  return "staff_notices";
}

export function teacherCategoryFromAppNotification(
  notification: AppNotification,
): TeacherNotification["category"] {
  const text = haystack(notification);

  if (isSosOrEmergency(notification, text)) return "urgent";

  if (
    notification.category === "transport" ||
    text.includes("transport") ||
    /driver started|trip started|trip completed|bus approaching|route issue/.test(text)
  ) {
    return "transport";
  }

  if (
    /diary overdue|diary due|class diary|activity diary|diary pending/.test(text) ||
    text.includes("diary")
  ) {
    return "homework";
  }

  if (
    notification.category === "leave" ||
    /leave request|leave approved|leave rejected|leave submitted|leave sent/.test(text)
  ) {
    return "leave";
  }

  if (notification.category === "assignments") return "homework";
  if (notification.category === "fees" || /payment received/.test(text)) return "staff_notices";
  if (notification.category === "academic" || /timetable published/.test(text)) {
    return "staff_notices";
  }

  if (
    isAlertNotification(notification) &&
    notification.category !== "leave" &&
    notification.category !== "transport" &&
    notification.category !== "assignments"
  ) {
    return "urgent";
  }

  return toTeacherCategory(notification.category);
}

export function appNotificationToTeacherNotification(
  notification: AppNotification,
): TeacherNotification {
  return {
    id: notification.id,
    title: notification.title || "Notification",
    body: notification.desc || "",
    category: teacherCategoryFromAppNotification(notification),
    time: notification.time || "",
    unread: notification.unread !== false,
    portalScope: "subject",
    href: notification.href,
  };
}
