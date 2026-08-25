/**
 * Shared multi-audience inbox for Phase 7 (exams / events / timetable).
 * One stable notification id per event; audiences stored as metadata (Phase 9).
 */
import type { AppNotification } from "@lumenx/types";

export const PHASE7_INBOX_KEY = "lumenx.phase7.notifications.v1";

export type Phase7Audience = "parent" | "student" | "teacher" | "admin";

export type Phase7InboxRow = AppNotification & {
  /** @deprecated Prefer `audiences` — kept for legacy rows. */
  audience?: Phase7Audience;
  audiences?: Phase7Audience[];
  module: "exams" | "events" | "timetable";
};

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage != null;
  } catch {
    return false;
  }
}

function loadAll(): Phase7InboxRow[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(PHASE7_INBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Phase7InboxRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(rows: Phase7InboxRow[]): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(PHASE7_INBOX_KEY, JSON.stringify(rows.slice(0, 300)));
  } catch {
    /* ignore */
  }
}

function rowAudiences(row: Phase7InboxRow): Phase7Audience[] {
  if (row.audiences?.length) return row.audiences;
  if (row.audience) return [row.audience];
  return [];
}

export function pushPhase7Inbox(row: Phase7InboxRow): void {
  const audiences = rowAudiences(row);
  const normalized: Phase7InboxRow = {
    ...row,
    audiences: audiences.length ? audiences : row.audiences,
    audience: audiences[0] ?? row.audience,
  };
  const all = loadAll().filter((r) => r.id !== normalized.id);
  saveAll([normalized, ...all]);
}

export function listPhase7Inbox(audience?: Phase7Audience): Phase7InboxRow[] {
  const all = loadAll();
  if (!audience) return all;
  return all.filter((r) => rowAudiences(r).includes(audience));
}

export function removePhase7InboxByPrefix(prefix: string): void {
  saveAll(loadAll().filter((r) => !r.id.startsWith(prefix)));
}

/** Cancel scheduled reminder rows for an entity (event/exam). */
export function cancelPhase7Reminders(entityKey: string): void {
  saveAll(
    loadAll().filter(
      (r) => !(r.id.includes("-reminder-") && r.id.includes(entityKey)),
    ),
  );
}
