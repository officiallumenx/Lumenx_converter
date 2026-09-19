import type { TransportNotification } from "../types";

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

function emit() {
  const snapshot = getAlertsSnapshot();
  notifyNewUrgentItems(snapshot);
  listeners.forEach((listener) => listener());
}

let cached: TransportNotification[] | null = null;

function invalidate() {
  cached = null;
}

export function subscribeAlertsStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAlertsSnapshot(): TransportNotification[] {
  if (!cached) cached = [...apiNotifications];
  return cached;
}

export function getUnreadAlertCount(): number {
  return getAlertsSnapshot().filter((n) => n.unread).length;
}

export function resetAlertsStore() {
  apiNotifications = [];
  surfacedUrgentIds = new Set();
  skipInitialUrgentSurfacing = true;
  invalidate();
  emit();
}

export function markAllAlertsReadInStore(): void {
  apiNotifications = apiNotifications.map((n) => ({ ...n, unread: false }));
  invalidate();
  emit();
}

export function markAlertReadInStore(id: string): void {
  apiNotifications = apiNotifications.map((n) =>
    n.id === id ? { ...n, unread: false } : n,
  );
  invalidate();
  emit();
}
