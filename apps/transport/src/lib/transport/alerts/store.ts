import {
  listTransportNotifications,
  markAllTransportNotificationsRead,
  markTransportNotificationRead,
  subscribeTransportNotifications,
  type TransportNotifCategory,
  type TransportWorkflowNotification,
} from "@lumenx/utils";

import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { transportSeed } from "../mock/seed";
import type { TransportNotification, TransportNotificationKind } from "../types";

const listeners = new Set<() => void>();

/** API inbox rows hydrated by TransportAlertsSync. */
let apiNotifications: TransportNotification[] = [];

export function setApiTransportNotifications(items: TransportNotification[]): void {
  apiNotifications = items;
  invalidate();
  emit();
}

/** Track urgent ids we've already surfaced with in-app alert + chime. */
let surfacedUrgentIds = new Set<string>();
let skipInitialUrgentSurfacing = true;

function notifyNewUrgentItems(notifications: TransportNotification[]): void {
  if (typeof window === "undefined") return;
  if (skipInitialUrgentSurfacing) {
    skipInitialUrgentSurfacing = false;
    surfacedUrgentIds = new Set(
      notifications.filter((n) => n.kind === "urgent").map((n) => n.id),
    );
    return;
  }
  for (const n of notifications) {
    if (n.kind !== "urgent" || !n.unread || surfacedUrgentIds.has(n.id)) continue;
    surfacedUrgentIds.add(n.id);
    void import("@lumenx/notifications").then(({ dispatchInAppAlert }) => {
      dispatchInAppAlert({
        title: n.title,
        body: n.message,
        href: n.href ?? "/alerts",
        variant: "alert",
        severity: "critical",
      });
    });
  }
  surfacedUrgentIds = new Set(
    notifications.filter((n) => n.kind === "urgent").map((n) => n.id),
  );
}

/** Seed chrome notifications (demo). Workflow events come from the shared bridge. */
let seedNotifications: TransportNotification[] = transportSeed.notifications.map((n) => ({
  ...n,
}));

function categoryToKind(category: TransportNotifCategory): TransportNotificationKind {
  switch (category) {
    case "sos":
    case "emergency":
      return "urgent";
    case "trip":
    case "approach":
      return "reminder";
    case "boarding":
      return "school";
    case "approval":
    case "route":
      return "route";
    default:
      return "school";
  }
}

function formatTime(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function workflowToAlert(n: TransportWorkflowNotification): TransportNotification {
  const reasonLine = n.reason ? ` Reason: ${n.reason}` : "";
  return {
    id: n.id,
    title: n.title,
    message: `${n.message}${reasonLine}`,
    time: formatTime(n.createdAt),
    kind: categoryToKind(n.category),
    unread: n.unread,
    href: n.href,
  };
}

function emit() {
  const snapshot = mergeSnapshot();
  notifyNewUrgentItems(snapshot);
  listeners.forEach((listener) => listener());
}

function mergeSnapshot(): TransportNotification[] {
  // API mode: notification inbox only — never fall back to seed/demo workflow SoT.
  if (isApiAuthMode()) {
    return [...apiNotifications];
  }
  const workflow = listTransportNotifications("driver").map(workflowToAlert);
  const seedIds = new Set(workflow.map((n) => n.id));
  const seeds = seedNotifications.filter((n) => !seedIds.has(n.id));
  return [...workflow, ...seeds];
}

let cached: TransportNotification[] | null = null;

function invalidate() {
  cached = null;
}

if (typeof window !== "undefined") {
  subscribeTransportNotifications(() => {
    invalidate();
    emit();
  });
}

export function subscribeAlertsStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAlertsSnapshot(): TransportNotification[] {
  if (!cached) cached = mergeSnapshot();
  return cached;
}

export function getUnreadAlertCount(): number {
  return getAlertsSnapshot().filter((n) => n.unread).length;
}

export function resetAlertsStore() {
  seedNotifications = transportSeed.notifications.map((n) => ({ ...n }));
  apiNotifications = [];
  surfacedUrgentIds = new Set();
  skipInitialUrgentSurfacing = true;
  invalidate();
  emit();
}

export function markAllAlertsReadInStore(): void {
  if (!isApiAuthMode()) {
    markAllTransportNotificationsRead("driver");
    seedNotifications = seedNotifications.map((n) => ({ ...n, unread: false }));
  }
  apiNotifications = apiNotifications.map((n) => ({ ...n, unread: false }));
  invalidate();
  emit();
}

export function markAlertReadInStore(id: string): void {
  if (!isApiAuthMode()) {
    markTransportNotificationRead(id);
    seedNotifications = seedNotifications.map((n) =>
      n.id === id ? { ...n, unread: false } : n,
    );
  }
  apiNotifications = apiNotifications.map((n) =>
    n.id === id ? { ...n, unread: false } : n,
  );
  invalidate();
  emit();
}
