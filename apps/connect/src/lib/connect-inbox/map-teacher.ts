import type { AppNotification } from "@lumenx/types";
import type { TeacherNotification } from "@/lib/teacher/types";

export function appNotificationToTeacherNotification(
  notification: AppNotification,
): TeacherNotification {
  const category =
    notification.category === "circulars"
      ? ("announcements" as const)
      : notification.category === "events"
        ? ("events" as const)
        : notification.category === "exams"
          ? ("exam_updates" as const)
          : notification.category === "emergency"
            ? ("urgent" as const)
            : ("staff_notices" as const);

  return {
    id: notification.id,
    title: notification.title,
    body: notification.desc,
    category,
    time: notification.time,
    unread: notification.unread !== false,
    portalScope: "subject",
    href: notification.href,
  };
}
