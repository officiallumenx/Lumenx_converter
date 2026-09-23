import type { AppNotification } from "@lumenx/types";
import type { TeacherNotification } from "@/lib/teacher/types";

const TEACHER_CATEGORIES = new Set<TeacherNotification["category"]>([
  "announcements",
  "events",
  "exam_updates",
  "staff_notices",
  "messages",
  "system",
  "urgent",
]);

function toTeacherCategory(
  category: AppNotification["category"] | string | null | undefined,
): TeacherNotification["category"] {
  if (category === "circulars") return "announcements";
  if (category === "events") return "events";
  if (category === "exams") return "exam_updates";
  if (category === "emergency") return "urgent";
  if (category === "academic" || category === "assignments") return "staff_notices";
  if (category && TEACHER_CATEGORIES.has(category as TeacherNotification["category"])) {
    return category as TeacherNotification["category"];
  }
  return "staff_notices";
}

export function appNotificationToTeacherNotification(
  notification: AppNotification,
): TeacherNotification {
  return {
    id: notification.id,
    title: notification.title || "Notification",
    body: notification.desc || "",
    category:
      notification.priority === "high" ? "urgent" : toTeacherCategory(notification.category),
    time: notification.time || "",
    unread: notification.unread !== false,
    portalScope: "subject",
    href: notification.href,
  };
}
