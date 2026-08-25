import { categorizedNotifications } from "@/lib/mock-data";
import type { AppNotification } from "@lumenx/types";
import {
  applyNotificationRetention,
  applyStarredFlags,
  setNotificationStarred,
  softDeleteNotification,
} from "@lumenx/utils";

type Listener = () => void;

function seedItems(): AppNotification[] {
  return applyNotificationRetention(
    applyStarredFlags(
      categorizedNotifications.student.map((n) => ({
        ...n,
        createdAt: n.createdAt ?? new Date().toISOString(),
      })),
    ),
  );
}

let items: AppNotification[] = seedItems();
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export const studentNotificationStore = {
  reset: () => {
    items = seedItems();
    notify();
  },
  /** Replace feed (e.g. merge Attendance inbox). Keeps read/star lifecycle helpers. */
  syncFromSource: (source: AppNotification[]) => {
    items = applyNotificationRetention(
      applyStarredFlags(
        source.map((n) => ({
          ...n,
          createdAt: n.createdAt ?? new Date().toISOString(),
        })),
      ),
    );
    notify();
  },
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
  toggleStar: (id: string) => {
    const current = items.find((n) => n.id === id);
    if (!current) return;
    const nextStarred = !current.starred;
    setNotificationStarred(id, nextStarred);
    items = items.map((n) => (n.id === id ? { ...n, starred: nextStarred } : n));
    notify();
  },
  softDelete: (id: string) => {
    const current = items.find((n) => n.id === id);
    if (!current) return;
    softDeleteNotification(current);
    items = items.filter((n) => n.id !== id);
    notify();
  },
  add: (notification: AppNotification) => {
    if (items.some((n) => n.id === notification.id)) return;
    items = applyNotificationRetention(
      applyStarredFlags([
        { ...notification, createdAt: notification.createdAt ?? new Date().toISOString() },
        ...items,
      ]),
    );
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
  { id: "important", label: "Important", categories: null as string[] | null },
  { id: "attendance", label: "Attendance", categories: ["attendance"] },
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
  if (filterId === "important") {
    return list.filter(
      (n) => n.priority === "high" || n.category === "emergency" || n.type === "warning",
    );
  }
  const def = STUDENT_NOTIFICATION_FILTERS.find((f) => f.id === filterId);
  if (!def?.categories) return list;
  const cats = def.categories as readonly string[];
  return list.filter((n) => cats.includes(n.category));
}
