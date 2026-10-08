import type { NotificationCategory } from "@lumenx/types";

/** Connect in-app labels for UI notification categories (severity color is separate). */
export const CONNECT_UI_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  academic: "Academic",
  attendance: "Attendance",
  assignments: "Homework",
  exams: "Exam",
  fees: "Fees",
  sports: "Sports",
  events: "Event",
  holidays: "Holiday",
  circulars: "Announcement",
  emergency: "Alert",
  messages: "Message",
  transport: "Transport",
  leave: "Leave",
  system: "Notice",
};

export function connectUiCategoryLabel(
  category: NotificationCategory | string | null | undefined,
): string {
  if (!category) return "Notice";
  return (
    CONNECT_UI_CATEGORY_LABELS[category as NotificationCategory] ?? "Notice"
  );
}
