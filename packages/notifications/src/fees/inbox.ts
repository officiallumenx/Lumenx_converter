/**
 * Persist fee parent notifications for Connect ingest (no payment gateway).
 */
import type { AppNotification } from "@lumenx/types";

export const FEES_PARENT_INBOX_KEY = "lumenx.fees.parent-notifications.v1";

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage != null;
  } catch {
    return false;
  }
}

export function pushFeesParentInbox(notification: AppNotification): void {
  if (!canUseStorage()) return;
  try {
    const raw = localStorage.getItem(FEES_PARENT_INBOX_KEY);
    const prev = raw ? (JSON.parse(raw) as AppNotification[]) : [];
    const list = Array.isArray(prev) ? prev : [];
    const next = [notification, ...list.filter((n) => n.id !== notification.id)].slice(0, 100);
    localStorage.setItem(FEES_PARENT_INBOX_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function listFeesParentInbox(): AppNotification[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(FEES_PARENT_INBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
