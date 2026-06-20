import type { SchoolAlert } from "@lumenx/types";

type Listener = () => void;

let items: SchoolAlert[] = [];
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export const alertStore = {
  init(seed: SchoolAlert[]) {
    items = seed.map((a) => ({ ...a }));
    notify();
  },
  getItems: (): SchoolAlert[] => items,
  getUnackCount: (): number => items.filter((a) => !a.acknowledged).length,
  getEmergencyCount: (): number =>
    items.filter((a) => a.severity === "emergency" && !a.acknowledged).length,
  acknowledge: (id: string) => {
    items = items.map((a) =>
      a.id === id ? { ...a, acknowledged: true, unread: false } : a,
    );
    notify();
  },
  acknowledgeAll: () => {
    items = items.map((a) => ({ ...a, acknowledged: true, unread: false }));
    notify();
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
