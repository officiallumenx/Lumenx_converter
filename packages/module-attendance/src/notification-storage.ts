/**
 * Persistence for attendance notification outbox / summary queue / Connect inbox.
 * Demo localStorage only — no backend.
 */

import type {
  AttendanceNotificationEvent,
  AttendanceNotificationInboxItem,
  AttendanceNotificationMessage,
} from "./notification-types";

export const ATTENDANCE_NOTIFICATION_OUTBOX_KEY =
  "lumenx.attendance-notification-outbox.v1";
export const ATTENDANCE_NOTIFICATION_SUMMARY_QUEUE_KEY =
  "lumenx.attendance-notification-summary-queue.v1";
/** Messages Connect parent/student portals can read (same-origin demo). */
export const ATTENDANCE_NOTIFICATION_INBOX_KEY =
  "lumenx.attendance-notification-inbox.v1";

export const ATTENDANCE_INBOX_CHANGED_EVENT = "lumenx-attendance-inbox";

type OutboxSnapshot = { messages: AttendanceNotificationMessage[] };
type QueueSnapshot = { events: AttendanceNotificationEvent[] };
type InboxSnapshot = { items: AttendanceNotificationInboxItem[] };

let memoryOutbox: AttendanceNotificationMessage[] = [];
let memoryQueue: AttendanceNotificationEvent[] = [];
let memoryInbox: AttendanceNotificationInboxItem[] = [];

function readJson<T>(key: string, fallback: T, memory: T): T {
  if (typeof localStorage === "undefined") return memory;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function notifyInboxChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(ATTENDANCE_INBOX_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

export function loadOutbox(): AttendanceNotificationMessage[] {
  if (typeof localStorage === "undefined") return [...memoryOutbox];
  const snap = readJson<OutboxSnapshot>(
    ATTENDANCE_NOTIFICATION_OUTBOX_KEY,
    { messages: [] },
    { messages: memoryOutbox },
  );
  return Array.isArray(snap.messages) ? snap.messages : [];
}

export function saveOutbox(messages: AttendanceNotificationMessage[]): void {
  memoryOutbox = [...messages];
  writeJson(ATTENDANCE_NOTIFICATION_OUTBOX_KEY, { messages });
}

export function loadQueue(): AttendanceNotificationEvent[] {
  if (typeof localStorage === "undefined") return [...memoryQueue];
  const snap = readJson<QueueSnapshot>(
    ATTENDANCE_NOTIFICATION_SUMMARY_QUEUE_KEY,
    { events: [] },
    { events: memoryQueue },
  );
  return Array.isArray(snap.events) ? snap.events : [];
}

export function saveQueue(events: AttendanceNotificationEvent[]): void {
  memoryQueue = [...events];
  writeJson(ATTENDANCE_NOTIFICATION_SUMMARY_QUEUE_KEY, { events });
}

export function loadInbox(): AttendanceNotificationInboxItem[] {
  if (typeof localStorage === "undefined") return [...memoryInbox];
  const snap = readJson<InboxSnapshot>(
    ATTENDANCE_NOTIFICATION_INBOX_KEY,
    { items: [] },
    { items: memoryInbox },
  );
  return Array.isArray(snap.items) ? snap.items : [];
}

export function saveInbox(items: AttendanceNotificationInboxItem[]): void {
  memoryInbox = [...items];
  writeJson(ATTENDANCE_NOTIFICATION_INBOX_KEY, { items });
  notifyInboxChanged();
}

export function clearNotificationStorageForTests(): void {
  memoryOutbox = [];
  memoryQueue = [];
  memoryInbox = [];
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(ATTENDANCE_NOTIFICATION_OUTBOX_KEY);
    localStorage.removeItem(ATTENDANCE_NOTIFICATION_SUMMARY_QUEUE_KEY);
    localStorage.removeItem(ATTENDANCE_NOTIFICATION_INBOX_KEY);
  } catch {
    /* ignore */
  }
}
