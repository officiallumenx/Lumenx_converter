/**
 * Admin Notification Center store — inbox for ops alerts.
 * Titles/bodies reuse `@lumenx/module-notifications` shared templates.
 */
import type { AppNotification, NotificationCategory } from "@lumenx/types";
import {
  getGenericNotificationTemplateId,
  NOTIFICATION_TEMPLATE_IDS,
  renderNotificationTemplate,
  type NotificationFeature,
} from "@lumenx/module-notifications";
import { softDeleteNotification } from "@lumenx/utils";

export const ADMIN_NOTIFICATION_CENTER_KEY = "lumenx.admin.notification-center.v1";
export const ADMIN_NOTIFICATIONS_CHANGED_EVENT = "lumenx:admin-notifications-changed";

export type AdminNotification = AppNotification & {
  templateId?: string;
  href?: string;
};

export type NotificationReadFilter = "all" | "unread" | "read";
export type NotificationDateFilter = "all" | "today" | "7d" | "30d";

const FEATURE_HREF: Record<NotificationFeature, string> = {
  admissions: "/admissions",
  attendance: "/student-attendance",
  fees: "/fees",
  transport: "/transport",
  events: "/events",
  messages: "/announcements",
  careers: "/careers",
};

const FEATURE_CATEGORY: Record<NotificationFeature, NotificationCategory> = {
  admissions: "circulars",
  attendance: "attendance",
  fees: "fees",
  transport: "circulars",
  events: "events",
  messages: "circulars",
  careers: "circulars",
};

function daysAgoIso(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

function relativeLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fromTemplate(input: {
  id: string;
  templateId: string;
  variables?: Record<string, string | number>;
  unread: boolean;
  createdAt: string;
  type?: AppNotification["type"];
  priority?: AppNotification["priority"];
  detail?: string;
  category?: NotificationCategory;
  href?: string;
}): AdminNotification {
  const rendered = renderNotificationTemplate({
    templateId: input.templateId,
    variables: input.variables,
  });
  const feature = rendered.feature;
  return {
    id: input.id,
    title: rendered.title,
    desc: rendered.body,
    detail: input.detail ?? rendered.body,
    time: relativeLabel(input.createdAt),
    type: input.type ?? "info",
    category: input.category ?? FEATURE_CATEGORY[feature],
    unread: input.unread,
    priority: input.priority ?? "normal",
    createdAt: input.createdAt,
    templateId: rendered.id,
    href: input.href ?? FEATURE_HREF[feature],
  };
}

function createSeedNotifications(): AdminNotification[] {
  return [
    fromTemplate({
      id: "admin-n-1",
      templateId: NOTIFICATION_TEMPLATE_IDS.admissions.parent.applicationSubmitted,
      variables: { applicationId: "ADM-2026-0842", studentName: "Riya Patel" },
      unread: true,
      createdAt: daysAgoIso(0, 9),
      type: "info",
      priority: "high",
      detail:
        "A new admissions application was submitted. Review the dossier and move to confirmation when ready.",
      category: "circulars",
      href: "/admissions",
    }),
    fromTemplate({
      id: "admin-n-2",
      templateId: NOTIFICATION_TEMPLATE_IDS.attendance.parent.dailyAbsence,
      variables: {
        studentName: "Arjun Mehta",
        slotLabel: "Full day",
        date: "4 Aug 2026",
        classLabel: "VIII",
        section: "B",
      },
      unread: true,
      createdAt: daysAgoIso(0, 11),
      type: "warning",
      priority: "normal",
      detail: "Parent will also receive this alert. Check Student Attendance if a correction is needed.",
    }),
    fromTemplate({
      id: "admin-n-3",
      templateId: getGenericNotificationTemplateId("fees", "admin"),
      variables: {
        message: "Offline office payment recorded for STU-1042 · ₹12,500 · Receipt LXF-R-1001.",
      },
      unread: true,
      createdAt: daysAgoIso(1, 14),
      type: "positive",
      priority: "normal",
      detail: "Paid and due amounts updated on the student fee account. Open Fees to download the receipt.",
      href: "/fees",
      category: "fees",
    }),
    fromTemplate({
      id: "admin-n-4",
      templateId: NOTIFICATION_TEMPLATE_IDS.careers.student.applicationSubmitted,
      variables: {
        applicationId: "CR-118",
        jobTitle: "Mathematics Teacher",
        instituteName: "Test1School",
      },
      unread: false,
      createdAt: daysAgoIso(2, 16),
      type: "info",
      priority: "normal",
      detail: "A careers application entered the pipeline. Open Careers to review attachments.",
      href: "/careers",
    }),
    fromTemplate({
      id: "admin-n-5",
      templateId: NOTIFICATION_TEMPLATE_IDS.transport.teacher.routeDelayReminder,
      variables: { location: "NH-16 junction near Sector 12" },
      unread: false,
      createdAt: daysAgoIso(3, 8),
      type: "warning",
      priority: "high",
      detail: "Coordinate with Transport if morning pickups need temporary stop changes.",
      href: "/transport",
    }),
    fromTemplate({
      id: "admin-n-6",
      templateId: getGenericNotificationTemplateId("events", "admin"),
      variables: {
        message: "Annual Sports Meet programme published for 12 Aug 2026. Announce when ready.",
      },
      unread: false,
      createdAt: daysAgoIso(5, 12),
      type: "info",
      priority: "low",
      detail: "Event is listed under Institute Events. Certificate generation remains under development.",
      href: "/events",
      category: "events",
    }),
    fromTemplate({
      id: "admin-n-7",
      templateId: getGenericNotificationTemplateId("messages", "admin"),
      variables: {
        message: "Two parent complaints await acknowledgment in the Complaints queue.",
      },
      unread: true,
      createdAt: daysAgoIso(6, 17),
      type: "warning",
      priority: "high",
      detail: "Open Complaints to assign an owner and reply.",
      href: "/complaints",
      category: "circulars",
    }),
    fromTemplate({
      id: "admin-n-8",
      templateId: NOTIFICATION_TEMPLATE_IDS.admissions.parent.seatsAvailable,
      variables: { applicationId: "ADM-2026-0711" },
      unread: false,
      createdAt: daysAgoIso(12, 10),
      type: "positive",
      priority: "normal",
      detail: "Waitlisted family was notified that seats opened. Track confirmation status in Admissions.",
      href: "/admissions",
    }),
    fromTemplate({
      id: "admin-n-9",
      templateId: getGenericNotificationTemplateId("attendance", "admin"),
      variables: {
        message: "Class IX-A attendance for yesterday is still incomplete (12 unmarked).",
      },
      unread: false,
      createdAt: daysAgoIso(20, 9),
      type: "warning",
      priority: "normal",
      detail: "Remind the class teacher or complete marks from Student Attendance.",
      href: "/student-attendance",
      category: "attendance",
    }),
    fromTemplate({
      id: "admin-n-10",
      templateId: getGenericNotificationTemplateId("fees", "admin"),
      variables: {
        message: "Term-1 fee publish for Class VI–VIII scheduled collections are live for parents.",
      },
      unread: false,
      createdAt: daysAgoIso(28, 15),
      type: "info",
      priority: "low",
      detail: "Parents see dues in Connect. Office collections continue offline.",
      href: "/fees",
      category: "fees",
    }),
  ];
}

function emitChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ADMIN_NOTIFICATIONS_CHANGED_EVENT));
}

function refreshTimeLabels(items: AdminNotification[]): AdminNotification[] {
  return items.map((n) =>
    n.createdAt ? { ...n, time: relativeLabel(n.createdAt) } : n,
  );
}

function loadRaw(): AdminNotification[] {
  if (typeof localStorage === "undefined") return createSeedNotifications();
  try {
    const raw = localStorage.getItem(ADMIN_NOTIFICATION_CENTER_KEY);
    if (!raw) {
      const seed = createSeedNotifications();
      localStorage.setItem(ADMIN_NOTIFICATION_CENTER_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as AdminNotification[];
    if (!Array.isArray(parsed)) return createSeedNotifications();
    return refreshTimeLabels(parsed);
  } catch {
    return createSeedNotifications();
  }
}

function save(items: AdminNotification[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(ADMIN_NOTIFICATION_CENTER_KEY, JSON.stringify(items));
  } catch {
    // ignore quota
  }
  emitChanged();
}

export function getAdminNotifications(): AdminNotification[] {
  return loadRaw().slice().sort((a, b) => {
    const at = a.createdAt ?? "";
    const bt = b.createdAt ?? "";
    return bt.localeCompare(at);
  });
}

export function prependAdminNotification(row: AdminNotification): void {
  const existing = loadRaw().filter((item) => item.id !== row.id);
  save([row, ...existing]);
}

export function getAdminUnreadCount(): number {
  return getAdminNotifications().filter((n) => n.unread).length;
}

export function markAdminNotificationRead(id: string): void {
  const next = loadRaw().map((n) => (n.id === id ? { ...n, unread: false } : n));
  save(next);
}

export function markAllAdminNotificationsRead(): void {
  const next = loadRaw().map((n) => ({ ...n, unread: false }));
  save(next);
}

export function deleteAdminNotification(id: string): void {
  const hit = loadRaw().find((n) => n.id === id);
  if (hit) {
    softDeleteNotification({
      id: hit.id,
      title: hit.title,
      desc: hit.desc ?? hit.detail ?? hit.title,
      createdAt: hit.createdAt,
    });
  }
  save(loadRaw().filter((n) => n.id !== id));
}

export function deleteAllAdminNotifications(): void {
  save([]);
}

export function getAdminNotificationById(id: string): AdminNotification | undefined {
  return getAdminNotifications().find((n) => n.id === id);
}

export function subscribeAdminNotifications(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener(ADMIN_NOTIFICATIONS_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(ADMIN_NOTIFICATIONS_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function matchesDateFilter(
  n: AdminNotification,
  filter: NotificationDateFilter,
  now = Date.now(),
): boolean {
  if (filter === "all") return true;
  const created = n.createdAt ? new Date(n.createdAt).getTime() : NaN;
  if (!Number.isFinite(created)) return false;
  const days = (now - created) / (1000 * 60 * 60 * 24);
  if (filter === "today") return days < 1;
  if (filter === "7d") return days < 7;
  return days < 30;
}

export function filterAdminNotifications(
  items: AdminNotification[],
  opts: {
    read: NotificationReadFilter;
    category: NotificationCategory | "all";
    date: NotificationDateFilter;
    query: string;
  },
): AdminNotification[] {
  const q = opts.query.trim().toLowerCase();
  return items.filter((n) => {
    if (opts.read === "unread" && !n.unread) return false;
    if (opts.read === "read" && n.unread) return false;
    if (opts.category !== "all" && n.category !== opts.category) return false;
    if (!matchesDateFilter(n, opts.date)) return false;
    if (!q) return true;
    const hay = `${n.title} ${n.desc} ${n.detail ?? ""} ${n.templateId ?? ""}`.toLowerCase();
    return hay.includes(q);
  });
}

export const ADMIN_NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  academic: "Academic",
  attendance: "Attendance",
  assignments: "Assignments",
  exams: "Exams",
  fees: "Fees",
  sports: "Sports",
  events: "Events",
  holidays: "Holidays",
  circulars: "Circulars",
  emergency: "Emergency",
};

/** Reset demo inbox (seed again). */
export function resetAdminNotificationCenter(): void {
  const seed = createSeedNotifications();
  save(seed);
}
