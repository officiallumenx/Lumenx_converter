import { categorizedNotifications } from "@/lib/mock-data";
import type { AppNotification } from "@lumenx/types";

type Listener = () => void;

let items: AppNotification[] = categorizedNotifications.student.map((n) => ({ ...n }));
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export const studentNotificationStore = {
  getItems: (): AppNotification[] => items,
  getUnreadCount: (): number => items.filter((n) => n.unread).length,
  markRead: (id: string) => {
    items = items.map((n) => (n.id === id ? { ...n, unread: false } : n));
    notify();
  },
  markAllRead: () => {
    items = items.map((n) => ({ ...n, unread: false }));
    notify();
  },
  add: (notification: AppNotification) => {
    if (items.some((n) => n.id === notification.id)) return;
    items = [notification, ...items];
    notify();
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Student portal filter groups mapped to underlying notification categories */
export const STUDENT_NOTIFICATION_FILTERS = [
  { id: "all", label: "All", categories: null as string[] | null },
  { id: "announcements", label: "Announcements", categories: ["circulars", "holidays"] },
  { id: "events", label: "Events", categories: ["events"] },
  { id: "exams", label: "Exams", categories: ["exams"] },
  { id: "results", label: "Results", categories: ["academic"] },
  { id: "institute", label: "Institute Updates", categories: ["emergency", "circulars"] },
] as const;

export type StudentNotificationFilterId = (typeof STUDENT_NOTIFICATION_FILTERS)[number]["id"];

export function filterStudentNotifications(
  list: AppNotification[],
  filterId: StudentNotificationFilterId,
): AppNotification[] {
  if (filterId === "all") return list;
  const def = STUDENT_NOTIFICATION_FILTERS.find((f) => f.id === filterId);
  if (!def?.categories) return list;
  return list.filter((n) => def.categories!.includes(n.category));
}
