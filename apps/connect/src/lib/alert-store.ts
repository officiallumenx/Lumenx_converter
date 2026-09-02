import type { SchoolAlert } from "@lumenx/types";
import { listenDemoSync, loadBroadcastInbox, type DemoBroadcast } from "@lumenx/utils";
import { isApiAuthMode } from "@/auth/auth-mode";

type Listener = () => void;

let items: SchoolAlert[] = [];
let initialized = false;
let demoBroadcastListening = false;
const listeners = new Set<Listener>();
let ackHandler: ((id: string) => void | Promise<void>) | null = null;
let ackAllHandler: (() => void | Promise<void>) | null = null;

export function setAlertStoreAckHandlers(handlers: {
  onAck?: ((id: string) => void | Promise<void>) | null;
  onAckAll?: (() => void | Promise<void>) | null;
}): void {
  ackHandler = handlers.onAck ?? null;
  ackAllHandler = handlers.onAckAll ?? null;
}

function notify() {
  listeners.forEach((l) => l());
}

function alertFromBroadcast(row: DemoBroadcast): SchoolAlert {
  const sender = row.sender ? ` · ${row.sender}` : "";
  const attach = row.attachmentName ? ` · Attachment: ${row.attachmentName}` : "";
  return {
    id: `bc-${row.id}`,
    title: row.title,
    summary: row.message || `Broadcast · ${row.audience}${sender}`,
    detail: `${row.message || ""}${attach}`.trim() || row.title,
    severity: row.priority === "critical" ? "emergency" : "mandatory",
    category: "leave",
    time: row.time,
    source: row.sender ? `${row.sender} broadcast` : "Admin broadcast",
    unread: true,
    acknowledged: false,
    actionRequired: false,
  };
}

function ingestBroadcasts() {
  if (isApiAuthMode()) return;
  for (const row of loadBroadcastInbox()) {
    if (items.some((a) => a.id === `bc-${row.id}`)) continue;
    items = [alertFromBroadcast(row), ...items];
  }
}

function ensureDemoBroadcastListener() {
  if (isApiAuthMode() || demoBroadcastListening || typeof window === "undefined") return;
  demoBroadcastListening = true;
  listenDemoSync("broadcast", () => {
    if (isApiAuthMode()) return;
    ingestBroadcasts();
    notify();
  });
}

export const alertStore = {
  /**
   * Seed the store once per session. Merges (by id) so runtime alerts added before the
   * first alerts screen mounts (e.g. leave alerts) are never wiped, and repeated mounts /
   * navigation don't reset dynamic alerts. Use reset() on sign-out to allow re-seeding.
   */
  initOnce(seed: SchoolAlert[]) {
    if (initialized) return;
    initialized = true;
    const existingIds = new Set(items.map((a) => a.id));
    const seedToAdd = seed.filter((a) => !existingIds.has(a.id)).map((a) => ({ ...a }));
    if (seedToAdd.length > 0) {
      items = [...items, ...seedToAdd];
    }
    if (!isApiAuthMode()) {
      ingestBroadcasts();
      ensureDemoBroadcastListener();
    }
    notify();
  },
  /**
   * Replace store contents from the school-alerts portal API (API auth mode).
   * Keeps leave-action alerts that are not school-alert inbox rows.
   */
  replaceFromApi(alerts: SchoolAlert[]) {
    const apiIds = new Set(alerts.map((a) => a.id));
    const keepLocal = items.filter(
      (a) =>
        !apiIds.has(a.id) &&
        !a.id.startsWith("bc-") &&
        Boolean(a.relatedLeaveId || a.actionRequired),
    );
    items = [...alerts.map((a) => ({ ...a })), ...keepLocal];
    initialized = true;
    notify();
  },
  reset() {
    items = [];
    initialized = false;
    ackHandler = null;
    ackAllHandler = null;
    notify();
  },
  getItems: (): SchoolAlert[] => items,
  getUnackCount: (): number => items.filter((a) => !a.acknowledged).length,
  getEmergencyCount: (): number =>
    items.filter((a) => a.severity === "emergency" && !a.acknowledged).length,
  acknowledge: (id: string) => {
    items = items.map((a) => (a.id === id ? { ...a, acknowledged: true, unread: false } : a));
    notify();
    void ackHandler?.(id);
  },
  acknowledgeAll: () => {
    items = items.map((a) => ({ ...a, acknowledged: true, unread: false }));
    notify();
    void ackAllHandler?.();
  },
  /** Resolve any still-actionable alerts tied to a leave request (after approve/reject/dismiss). */
  resolveByLeaveId: (leaveId: string) => {
    let changed = false;
    items = items.map((a) => {
      if (a.relatedLeaveId === leaveId && a.actionRequired) {
        changed = true;
        return { ...a, actionRequired: false, acknowledged: true, unread: false };
      }
      return a;
    });
    if (changed) notify();
  },
  addAlert: (alert: SchoolAlert) => {
    const existed = items.some((entry) => entry.id === alert.id);
    items = [alert, ...items.filter((entry) => entry.id !== alert.id)];
    notify();
    if (
      !existed &&
      !alert.acknowledged &&
      (alert.severity === "emergency" || alert.severity === "mandatory")
    ) {
      import("@lumenx/notifications").then(({ dispatchInAppAlert }) => {
        dispatchInAppAlert({
          title: alert.title,
          body: alert.summary,
          href: "/alerts",
          variant: "alert",
          severity: alert.severity,
        });
      });
    }
  },
  updateAlert: (id: string, patch: Partial<SchoolAlert>) => {
    items = items.map((a) => (a.id === id ? { ...a, ...patch } : a));
    notify();
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
