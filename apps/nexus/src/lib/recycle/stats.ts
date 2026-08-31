import { RECYCLE_BIN_RETENTION_DAYS } from "@lumenx/utils";

export function daysLeftFromDeletedAt(
  deletedAt: string,
  now = Date.now(),
): number {
  if (!deletedAt) return 0;
  const daysSince =
    (now - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(RECYCLE_BIN_RETENTION_DAYS - daysSince));
}

export function countExpiringSoon(
  items: Array<{ deletedAt: string }>,
  withinDays = 7,
  now = Date.now(),
): number {
  return items.filter(
    (item) => daysLeftFromDeletedAt(item.deletedAt, now) <= withinDays,
  ).length;
}

export function listRecycleModules(
  items: Array<{ module: string }>,
): string[] {
  return [...new Set(items.map((item) => item.module))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function filterRecycleByModule<T extends { module: string }>(
  items: T[],
  module: string,
): T[] {
  if (module === "all") return items;
  return items.filter((item) => item.module === module);
}
