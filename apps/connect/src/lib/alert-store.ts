import type { SchoolAlert } from "@lumenx/types";

type Listener = () => void;

let items: SchoolAlert[] = [];
let initialized = false;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
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
    if (seedToAdd.length === 0) {
      notify();
      return;
    }
    items = [...items, ...seedToAdd];
    notify();
  },
  reset() {
    items = [];
    initialized = false;
    notify();
  },
  getItems: (): SchoolAlert[] => items,
  getUnackCount: (): number => items.filter((a) => !a.acknowledged).length,
  getEmergencyCount: (): number =>
    items.filter((a) => a.severity === "emergency" && !a.acknowledged).length,
  acknowledge: (id: string) => {
    items = items.map((a) => (a.id === id ? { ...a, acknowledged: true, unread: false } : a));
    notify();
  },
  acknowledgeAll: () => {
    items = items.map((a) => ({ ...a, acknowledged: true, unread: false }));
    notify();
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
    items = [alert, ...items];
    notify();
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
