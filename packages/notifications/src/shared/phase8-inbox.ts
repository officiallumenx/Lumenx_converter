/**
 * Shared multi-audience inbox for Phase 8 (complaints / documents / certificates / system).
 * One stable notification id per event; audiences as metadata (Phase 9).
 */
import type { AppNotification } from "@lumenx/types";

export const PHASE8_INBOX_KEY = "lumenx.phase8.notifications.v1";

export type Phase8Audience = "parent" | "student" | "teacher" | "admin" | "institute";

export type Phase8InboxRow = AppNotification & {
  /** @deprecated Prefer `audiences` — kept for legacy rows. */
  audience?: Phase8Audience;
  audiences?: Phase8Audience[];
  module: "complaints" | "documents" | "certificates" | "system";
};

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage != null;
  } catch {
    return false;
  }
}

function loadAll(): Phase8InboxRow[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(PHASE8_INBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Phase8InboxRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(rows: Phase8InboxRow[]): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(PHASE8_INBOX_KEY, JSON.stringify(rows.slice(0, 300)));
  } catch {
    /* ignore */
  }
}

function rowAudiences(row: Phase8InboxRow): Phase8Audience[] {
  if (row.audiences?.length) return row.audiences;
  if (row.audience) return [row.audience];
  return [];
}

export function pushPhase8Inbox(row: Phase8InboxRow): void {
  const audiences = rowAudiences(row);
  const normalized: Phase8InboxRow = {
    ...row,
    audiences: audiences.length ? audiences : row.audiences,
    audience: audiences[0] ?? row.audience,
  };
  const all = loadAll().filter((r) => r.id !== normalized.id);
  saveAll([normalized, ...all]);
}

export function listPhase8Inbox(audience?: Phase8Audience): Phase8InboxRow[] {
  const all = loadAll();
  if (!audience) return all;
  if (audience === "institute") return all;
  return all.filter(
    (r) => rowAudiences(r).includes(audience) || rowAudiences(r).includes("institute"),
  );
}
