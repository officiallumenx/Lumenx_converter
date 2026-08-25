/**
 * Soft delete + Recycle Bin.
 * Retention: 90 days, then permanent purge.
 */

export const RECYCLE_BIN_KEY = "lumenx.recycle-bin.v1";
export const RECYCLE_BIN_RETENTION_DAYS = 90;

export type RecycleBinModule =
  | "Students"
  | "Teachers"
  | "Parents"
  | "Accounts"
  | "Subjects"
  | "Documents"
  | "Events"
  | "Templates"
  | "Homework"
  | "Other";

export type RecycleBinItem = {
  id: string;
  module: RecycleBinModule;
  title: string;
  subtitle?: string;
  deletedAt: string;
  deletedBy: string;
  /** Original entity payload for restore (demo). */
  snapshot?: Record<string, unknown>;
  purged?: boolean;
};

function readAll(): RecycleBinItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECYCLE_BIN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecycleBinItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: RecycleBinItem[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify(items.slice(0, 500)));
  } catch {
    // Ignore quota / private mode.
  }
}

function daysSince(iso: string, now = Date.now()): number {
  return (now - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

export function softDeleteToRecycleBin(input: {
  module: RecycleBinModule;
  title: string;
  subtitle?: string;
  deletedBy?: string;
  snapshot?: Record<string, unknown>;
  id?: string;
}): RecycleBinItem {
  const item: RecycleBinItem = {
    id: input.id ?? `rb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    module: input.module,
    title: input.title,
    subtitle: input.subtitle,
    deletedAt: new Date().toISOString(),
    deletedBy: input.deletedBy ?? "Admin",
    snapshot: input.snapshot,
  };
  writeAll([item, ...purgeExpiredRecycleBin(readAll())]);
  return item;
}

/** Remove items older than retention (90 days). */
export function purgeExpiredRecycleBin(
  items: RecycleBinItem[] = readAll(),
  now = Date.now(),
): RecycleBinItem[] {
  const kept = items.filter(
    (i) => !i.purged && daysSince(i.deletedAt, now) < RECYCLE_BIN_RETENTION_DAYS,
  );
  writeAll(kept);
  return kept;
}

export function loadRecycleBin(): RecycleBinItem[] {
  return purgeExpiredRecycleBin().sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

export function restoreFromRecycleBin(id: string): RecycleBinItem | null {
  const all = readAll();
  const hit = all.find((i) => i.id === id) ?? null;
  if (!hit) return null;
  writeAll(all.filter((i) => i.id !== id));
  return hit;
}

export function permanentlyDeleteFromRecycleBin(id: string): void {
  writeAll(readAll().filter((i) => i.id !== id));
}

export function daysLeftInRecycleBin(item: RecycleBinItem, now = Date.now()): number {
  return Math.max(0, Math.ceil(RECYCLE_BIN_RETENTION_DAYS - daysSince(item.deletedAt, now)));
}

export function ensureRecycleBinDemoSeed(): void {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(RECYCLE_BIN_KEY)) return;
  const now = Date.now();
  writeAll([
    {
      id: "rb-demo-1",
      module: "Documents",
      title: "Old fee circular.pdf",
      subtitle: "Uploaded Mar 2026",
      deletedAt: new Date(now - 12 * 86_400_000).toISOString(),
      deletedBy: "Admin R. Chen",
    },
    {
      id: "rb-demo-2",
      module: "Events",
      title: "Draft sports day flyer",
      subtitle: "Institute Events",
      deletedAt: new Date(now - 40 * 86_400_000).toISOString(),
      deletedBy: "Principal",
    },
    {
      id: "rb-demo-3",
      module: "Students",
      title: "Duplicate import row · Test Student",
      subtitle: "Bulk import cleanup",
      deletedAt: new Date(now - 2 * 86_400_000).toISOString(),
      deletedBy: "Admin",
    },
  ]);
}
