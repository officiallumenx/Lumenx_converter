import type { AppNotification } from "@lumenx/types";

type Listener = () => void;

const STORAGE_KEY = "ues_connect_parent_notif_read_v2";

let items: AppNotification[] = [];
let syncedChildId: string | null = null;
const listeners = new Set<Listener>();

let readIds = loadReadIds();

function notify() {
  listeners.forEach((l) => l());
}

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveReadIds() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...readIds]));
  } catch {
    // ignore quota / private mode
  }
}

function applyReadState(list: AppNotification[]): AppNotification[] {
  return list.map((n) => ({
    ...n,
    unread: readIds.has(n.id) ? false : n.unread,
  }));
}

export const parentNotificationStore = {
  syncForChild(childId: string, source: AppNotification[]) {
    const next = applyReadState(source.map((n) => ({ ...n })));
    const sameChild = syncedChildId === childId;
    const sameSnapshot =
      sameChild &&
      next.length === items.length &&
      next.every(
        (n, i) => n.id === items[i]?.id && n.unread === items[i]?.unread,
      );

    syncedChildId = childId;
    items = next;

    if (!sameSnapshot) notify();
  },

  reset() {
    items = [];
    syncedChildId = null;
    notify();
  },

  getItems: (): AppNotification[] => items,

  getUnreadCount: (): number => items.filter((n) => n.unread).length,

  markRead: (id: string) => {
    if (!items.some((n) => n.id === id && n.unread)) return;
    readIds.add(id);
    saveReadIds();
    items = items.map((n) => (n.id === id ? { ...n, unread: false } : n));
    notify();
  },

  markAllRead: () => {
    let changed = false;
    items = items.map((n) => {
      if (!n.unread) return n;
      readIds.add(n.id);
      changed = true;
      return { ...n, unread: false };
    });
    if (changed) {
      saveReadIds();
      notify();
    }
  },

  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
