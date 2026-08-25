/** Shared dated items for Academic Calendar and Institute Events. */

import { createLocalStorageStore } from "@/lib/client-data-store";
import { CALENDAR_EXAMS, CALENDAR_HOLIDAYS } from "@/lib/admin-module-data";

export type InstituteCalendarKind = "holiday" | "exam" | "meeting" | "function" | "custom";

export type InstituteCalendarItem = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  kind: string;
  audience?: string;
  location?: string;
  description?: string;
  reminder?: string;
  bannerDataUrl?: string;
  /** Optional attachment (data URL or label). */
  attachmentName?: string;
  attachmentDataUrl?: string;
  /** Optional registration / RSVP required. */
  registrationRequired?: boolean;
  /** Optional recurrence label (e.g. weekly). */
  recurrence?: string;
  rsvp?: number;
  published: boolean;
  cancelled?: boolean;
  cancellationReason?: string;
  /** Which Admin surface originally created the row — preserved on cross-screen edits. */
  source: "calendar" | "events";
};

const STORAGE_KEY = "lumenx.admin.calendar-events.v1";
const EVENT_NAME = "lumenx-calendar-events-changed";

/** Stable id for new rows — one record shared by Calendar and Events. */
export function createCalendarEventId(prefix: "cal" | "evt" = "cal"): string {
  return `${prefix}-${Date.now()}`;
}

function seedItems(): InstituteCalendarItem[] {
  const fromCalendar: InstituteCalendarItem[] = [
    ...CALENDAR_HOLIDAYS.map((row, index) => ({
      id: `cal-h-${index + 1}`,
      title: row.title,
      date: row.date,
      kind: "holiday",
      published: true,
      source: "calendar" as const,
    })),
    ...CALENDAR_EXAMS.map((row, index) => ({
      id: `cal-e-${index + 1}`,
      title: row.title,
      date: row.date,
      kind: "exam",
      published: true,
      source: "calendar" as const,
    })),
  ];

  /** Event-only demo rows — holidays/exams live in the calendar seed above (no duplicates). */
  const fromEvents: InstituteCalendarItem[] = [
    {
      id: "evt-1",
      title: "Annual Science Symposium",
      date: "2026-05-22",
      time: "09:00",
      kind: "function",
      audience: "All grades",
      location: "Main Auditorium",
      rsvp: 412,
      published: true,
      source: "events",
    },
    {
      id: "evt-2",
      title: "Parent–Teacher Conference",
      date: "2026-05-24",
      time: "14:00",
      kind: "meeting",
      audience: "Parents · Grade 10–12",
      location: "Block B Halls",
      rsvp: 198,
      published: true,
      source: "events",
    },
    {
      id: "evt-5",
      title: "Inter-house Sports Meet",
      date: "2026-06-06",
      time: "07:30",
      kind: "function",
      audience: "All grades",
      location: "Athletics Field",
      rsvp: 1240,
      published: false,
      source: "events",
    },
    {
      id: "evt-6",
      title: "Senior Leadership Sync",
      date: "2026-06-10",
      time: "16:00",
      kind: "meeting",
      audience: "Heads of Department",
      location: "Boardroom A",
      published: true,
      source: "events",
    },
  ];

  return [...fromCalendar, ...fromEvents];
}

const calendarEventsStore = createLocalStorageStore<InstituteCalendarItem[]>({
  storageKey: STORAGE_KEY,
  eventName: EVENT_NAME,
  seed: seedItems,
  parse: (raw) => {
    const parsed = JSON.parse(raw) as InstituteCalendarItem[];
    return Array.isArray(parsed) ? parsed : seedItems();
  },
});

export function loadCalendarEvents(): InstituteCalendarItem[] {
  return calendarEventsStore.load();
}

export function getCalendarEventById(id: string): InstituteCalendarItem | undefined {
  return calendarEventsStore.load().find((row) => row.id === id);
}

export function subscribeCalendarEvents(listener: () => void): () => void {
  return calendarEventsStore.subscribe(listener);
}

export function useCalendarEvents(): InstituteCalendarItem[] {
  return calendarEventsStore.useSnapshot();
}

/** Insert or update by stable id — merges with existing row (single shared record). */
export function upsertCalendarEvent(item: InstituteCalendarItem): void {
  calendarEventsStore.mutate((rows) => {
    const idx = rows.findIndex((row) => row.id === item.id);
    if (idx < 0) return [item, ...rows];
    const next = [...rows];
    next[idx] = { ...rows[idx], ...item, id: item.id };
    return next;
  });
}

/** Remove by stable id — disappears from every view subscribed to the shared store. */
export function deleteCalendarEvent(id: string): boolean {
  let removed = false;
  calendarEventsStore.mutate((rows) => {
    const next = rows.filter((row) => row.id !== id);
    removed = next.length !== rows.length;
    return next;
  });
  return removed;
}

export function publishCalendarEvent(id: string): void {
  calendarEventsStore.mutate((rows) =>
    rows.map((row) =>
      row.id === id
        ? { ...row, published: true, cancelled: false, cancellationReason: undefined }
        : row,
    ),
  );
}

/** Soft-cancel a published event (keeps row for audit; cancels reminders via caller notify). */
export function cancelCalendarEvent(id: string, reason: string): InstituteCalendarItem | null {
  let cancelled: InstituteCalendarItem | null = null;
  calendarEventsStore.mutate((rows) =>
    rows.map((row) => {
      if (row.id !== id) return row;
      cancelled = {
        ...row,
        cancelled: true,
        published: false,
        cancellationReason: reason.trim() || "This event has been cancelled.",
      };
      return cancelled;
    }),
  );
  return cancelled;
}

export function formatEventWhen(
  item: Pick<InstituteCalendarItem, "date" | "time" | "endDate">,
): string {
  const start = new Date(`${item.date}T${item.time || "00:00"}`);
  if (Number.isNaN(start.getTime())) return item.date;
  const datePart = start.toLocaleString(undefined, { month: "short", day: "numeric" });
  const endPart =
    item.endDate && item.endDate !== item.date
      ? ` – ${new Date(`${item.endDate}T00:00`).toLocaleString(undefined, { month: "short", day: "numeric" })}`
      : "";
  if (!item.time) return `${datePart}${endPart} · All day`;
  const timePart = start.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${datePart}${endPart} · ${timePart}`;
}

const PRESET_KINDS = new Set<InstituteCalendarKind>([
  "holiday",
  "exam",
  "meeting",
  "function",
  "custom",
]);

function hasInstituteEventDetail(item: InstituteCalendarItem): boolean {
  return Boolean(
    item.audience ||
      (item.location && item.location !== "TBD") ||
      item.description ||
      item.reminder ||
      item.bannerDataUrl ||
      item.rsvp != null ||
      item.time,
  );
}

/** Academic Calendar — holidays, exams, calendar entries, shared dated meetings/functions. */
export function isAcademicCalendarItem(item: InstituteCalendarItem): boolean {
  if (item.kind === "holiday" || item.kind === "exam") return true;
  if (item.source === "calendar") return true;
  if (item.kind === "meeting" || item.kind === "function") return true;
  return false;
}

/** Institute Events — functions, meetings, programs, institute-owned rows; shared when relevant. */
export function isInstituteEventItem(item: InstituteCalendarItem): boolean {
  if (item.source === "events") return true;
  if (item.kind === "function" || item.kind === "meeting") return true;
  if (!PRESET_KINDS.has(item.kind as InstituteCalendarKind)) return true;
  if (item.kind === "exam" || item.kind === "holiday") {
    return hasInstituteEventDetail(item);
  }
  return false;
}

export function filterAcademicCalendarItems(
  items: InstituteCalendarItem[],
): InstituteCalendarItem[] {
  return items.filter(isAcademicCalendarItem);
}

export function filterInstituteEventItems(items: InstituteCalendarItem[]): InstituteCalendarItem[] {
  return items.filter(isInstituteEventItem);
}
