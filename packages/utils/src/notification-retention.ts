/**
 * Notification retention policy.
 * - Active notifications: auto-delete after 90 days (unless starred)
 * - Soft-deleted notifications (recycle bin): purge after 15 days
 * - Starred: never auto-delete
 */

export const NOTIFICATION_RETENTION_DAYS = 90;
export const NOTIFICATION_RECYCLE_BIN_DAYS = 15;

export const NOTIFICATION_STATE_KEY = "lumenx.notification-lifecycle.v1";

export type NotificationLifecycleState = {
  starredIds: string[];
  /** Soft-deleted notifications waiting in recycle bin. */
  recycled: RecycledNotification[];
};

export type RecycledNotification = {
  id: string;
  title: string;
  desc: string;
  deletedAt: string;
  starred?: boolean;
  createdAt?: string;
};

export type RetentionAwareNotification = {
  id: string;
  title: string;
  desc: string;
  starred?: boolean;
  /** ISO created time; falls back to parsing `time` if absent. */
  createdAt?: string;
  deletedAt?: string;
  unread?: boolean;
  [key: string]: unknown;
};

function daysSince(iso: string, now = Date.now()): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return (now - t) / (1000 * 60 * 60 * 24);
}

function readState(): NotificationLifecycleState {
  if (typeof localStorage === "undefined") return { starredIds: [], recycled: [] };
  try {
    const raw = localStorage.getItem(NOTIFICATION_STATE_KEY);
    if (!raw) return { starredIds: [], recycled: [] };
    const parsed = JSON.parse(raw) as NotificationLifecycleState;
    return {
      starredIds: Array.isArray(parsed.starredIds) ? parsed.starredIds : [],
      recycled: Array.isArray(parsed.recycled) ? parsed.recycled : [],
    };
  } catch {
    return { starredIds: [], recycled: [] };
  }
}

function writeState(state: NotificationLifecycleState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(NOTIFICATION_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / private mode.
  }
}

export function isNotificationStarred(id: string): boolean {
  return readState().starredIds.includes(id);
}

export function setNotificationStarred(id: string, starred: boolean): void {
  const state = readState();
  const set = new Set(state.starredIds);
  if (starred) set.add(id);
  else set.delete(id);
  writeState({ ...state, starredIds: [...set] });
}

export function applyStarredFlags<T extends { id: string; starred?: boolean }>(
  items: T[],
): T[] {
  const starred = new Set(readState().starredIds);
  return items.map((n) => ({ ...n, starred: starred.has(n.id) || Boolean(n.starred) }));
}

/**
 * Keep notifications that are starred OR younger than 90 days.
 * Soft-deletes expired non-starred into the 15-day recycle bin.
 */
export function applyNotificationRetention<T extends RetentionAwareNotification>(
  items: T[],
  now = Date.now(),
): T[] {
  const state = readState();
  const starred = new Set(state.starredIds);
  const kept: T[] = [];
  const newlyRecycled: RecycledNotification[] = [];

  for (const n of items) {
    const isStarred = starred.has(n.id) || Boolean(n.starred);
    if (isStarred) {
      kept.push({ ...n, starred: true });
      continue;
    }
    const created = n.createdAt ?? inferCreatedAt(n);
    if (created && daysSince(created, now) >= NOTIFICATION_RETENTION_DAYS) {
      newlyRecycled.push({
        id: n.id,
        title: n.title,
        desc: n.desc,
        deletedAt: new Date(now).toISOString(),
        createdAt: created,
        starred: false,
      });
      continue;
    }
    kept.push(n);
  }

  const recycled = purgeNotificationRecycleBin(
    [...newlyRecycled, ...state.recycled],
    now,
  );
  writeState({ starredIds: [...starred], recycled });
  return kept;
}

function inferCreatedAt(n: RetentionAwareNotification): string | undefined {
  if (typeof n.time === "string" && /^\d{4}-\d{2}-\d{2}/.test(n.time)) return n.time;
  return undefined;
}

/** Soft-delete a notification into the 15-day recycle bin. */
export function softDeleteNotification(n: RetentionAwareNotification): void {
  const state = readState();
  if (state.starredIds.includes(n.id) || n.starred) {
    // Starred never auto-delete; explicit soft-delete still allowed into bin.
  }
  const recycled = [
    {
      id: n.id,
      title: n.title,
      desc: n.desc,
      deletedAt: new Date().toISOString(),
      createdAt: n.createdAt,
      starred: Boolean(n.starred),
    },
    ...state.recycled.filter((r) => r.id !== n.id),
  ];
  writeState({
    starredIds: state.starredIds.filter((id) => id !== n.id),
    recycled: purgeNotificationRecycleBin(recycled),
  });
}

export function loadNotificationRecycleBin(): RecycledNotification[] {
  const state = readState();
  const recycled = purgeNotificationRecycleBin(state.recycled);
  if (recycled.length !== state.recycled.length) {
    writeState({ ...state, recycled });
  }
  return recycled;
}

export function restoreNotificationFromBin(id: string): RecycledNotification | null {
  const state = readState();
  const hit = state.recycled.find((r) => r.id === id) ?? null;
  if (!hit) return null;
  writeState({
    ...state,
    recycled: state.recycled.filter((r) => r.id !== id),
  });
  return hit;
}

export function purgeNotificationRecycleBin(
  items: RecycledNotification[],
  now = Date.now(),
): RecycledNotification[] {
  return items.filter((i) => daysSince(i.deletedAt, now) < NOTIFICATION_RECYCLE_BIN_DAYS);
}

export function notificationRetentionSummary() {
  return {
    activeRetentionDays: NOTIFICATION_RETENTION_DAYS,
    recycleBinDays: NOTIFICATION_RECYCLE_BIN_DAYS,
    starredNeverAutoDelete: true as const,
  };
}
