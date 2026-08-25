import {
  listTransportNotifications,
  markAllTransportNotificationsRead,
  markTransportNotificationRead,
  subscribeTransportNotifications,
  type TransportNotifCategory,
  type TransportWorkflowNotification,
} from "@lumenx/utils";

import { transportSeed } from "../mock/seed";
import type { TransportNotification, TransportNotificationKind } from "../types";

const listeners = new Set<() => void>();

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
  listeners.forEach((listener) => listener());
}

function mergeSnapshot(): TransportNotification[] {
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
  invalidate();
  emit();
}

export function markAllAlertsReadInStore(): void {
  markAllTransportNotificationsRead("driver");
  seedNotifications = seedNotifications.map((n) => ({ ...n, unread: false }));
  invalidate();
  emit();
}

export function markAlertReadInStore(id: string): void {
  markTransportNotificationRead(id);
  seedNotifications = seedNotifications.map((n) =>
    n.id === id ? { ...n, unread: false } : n,
  );
  invalidate();
  emit();
}
