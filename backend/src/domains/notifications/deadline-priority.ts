/**
 * Mirror of packages/notifications deadline rules (backend cannot depend on that package).
 *
 * - more than 3 days remaining → normal
 * - within 3 days → important
 * - within 24 hours, or past due → critical
 */

export type DeadlinePriority = "normal" | "important" | "critical";
export type StoredNotificationPriority =
  | "normal"
  | "important"
  | "critical"
  | "success";

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

function parseDueAt(dueAt: string | Date): Date {
  if (dueAt instanceof Date) return dueAt;
  const trimmed = dueAt.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T23:59:59`);
  }
  return new Date(trimmed);
}

export function deadlinePriorityFromDueAt(
  dueAt: string | Date,
  now: Date = new Date(),
): DeadlinePriority {
  const due = parseDueAt(dueAt);
  const ms = due.getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "critical";
  if (ms <= MS_HOUR * 24) return "critical";
  if (ms <= MS_DAY * 3) return "important";
  return "normal";
}

const RANK: Record<StoredNotificationPriority, number> = {
  success: 0,
  normal: 1,
  important: 2,
  critical: 3,
};

export function escalatePriorityFromDueAt(
  stored: StoredNotificationPriority | null | undefined,
  dueAt: string | Date | null | undefined,
  now: Date = new Date(),
): StoredNotificationPriority {
  const base: StoredNotificationPriority = stored ?? "normal";
  if (!dueAt || base === "success" || base === "critical") return base;
  const fromDue = deadlinePriorityFromDueAt(dueAt, now);
  return RANK[fromDue] > RANK[base] ? fromDue : base;
}

export function notificationEntityPayload(
  entityType: string,
  entityId: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { entityType, entityId, ...extra };
}
