/**
 * Lightweight warm cache for parent linked-children list.
 * Lets Home render ChildSwitcher immediately on reopen while the API refreshes.
 * Scoped by userId + instituteId — cleared on logout / account switch.
 */
import type { Child } from "@lumenx/types";

const PREFIX = "lumenx-connect-linked-children-v1";

function storageKey(userId: string, instituteId: string): string {
  return `${PREFIX}:${userId.trim()}:${instituteId.trim()}`;
}

type StoredPayload = {
  userId: string;
  instituteId: string;
  savedAt: string;
  children: Child[];
};

/** Max age for presenting cached children as a warm shell (still background-refreshed). */
const MAX_AGE_MS = 7 * 24 * 60 * 60_000;

export function readLinkedChildrenCache(
  userId: string,
  instituteId: string,
): Child[] | null {
  if (typeof localStorage === "undefined") return null;
  const uid = userId.trim();
  const iid = instituteId.trim();
  if (!uid || !iid) return null;
  try {
    const raw = localStorage.getItem(storageKey(uid, iid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPayload;
    if (parsed.userId !== uid || parsed.instituteId !== iid) return null;
    if (!Array.isArray(parsed.children) || parsed.children.length === 0) return null;
    const savedAt = Date.parse(parsed.savedAt);
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > MAX_AGE_MS) {
      localStorage.removeItem(storageKey(uid, iid));
      return null;
    }
    return parsed.children.filter(
      (c): c is Child =>
        Boolean(c) &&
        typeof c.id === "string" &&
        typeof c.name === "string",
    );
  } catch {
    return null;
  }
}

export function writeLinkedChildrenCache(
  userId: string,
  instituteId: string,
  children: Child[],
): void {
  if (typeof localStorage === "undefined") return;
  const uid = userId.trim();
  const iid = instituteId.trim();
  if (!uid || !iid || children.length === 0) return;
  try {
    const payload: StoredPayload = {
      userId: uid,
      instituteId: iid,
      savedAt: new Date().toISOString(),
      children,
    };
    localStorage.setItem(storageKey(uid, iid), JSON.stringify(payload));
  } catch {
    // Quota / private mode — ignore.
  }
}

export function clearLinkedChildrenCacheForUser(userId: string): void {
  if (typeof localStorage === "undefined") return;
  const uid = userId.trim();
  if (!uid) return;
  const needle = `${PREFIX}:${uid}:`;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k?.startsWith(needle)) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    // ignore
  }
}

export function clearAllLinkedChildrenCaches(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k?.startsWith(`${PREFIX}:`)) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    // ignore
  }
}
