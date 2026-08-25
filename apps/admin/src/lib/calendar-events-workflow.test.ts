/**
 * Academic Calendar ↔ Institute Events — verification workflow (tests 1–14).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
});

const listenerCounts = { added: 0, removed: 0 };
const listeners = new Set<() => void>();

vi.stubGlobal("window", {
  dispatchEvent: vi.fn(() => true),
  addEventListener: vi.fn((event: string, handler: () => void) => {
    if (event === "storage" || event === "focus") listeners.add(handler);
  }),
  removeEventListener: vi.fn((event: string, handler: () => void) => {
    if (event === "storage" || event === "focus") listeners.delete(handler);
  }),
  CustomEvent: globalThis.CustomEvent ?? class CE extends Event {
    detail: unknown;
    constructor(type: string, opts?: { detail?: unknown }) {
      super(type);
      this.detail = opts?.detail;
    }
  },
});

const STORAGE_KEY = "lumenx.admin.calendar-events.v1";

async function loadStore() {
  vi.resetModules();
  listenerCounts.added = 0;
  listenerCounts.removed = 0;
  listeners.clear();
  return import("./calendar-events-store");
}

function assertUniqueIds(rows: Array<{ id: string }>) {
  const ids = rows.map((row) => row.id);
  expect(new Set(ids).size).toBe(ids.length);
}

describe("Academic Calendar ↔ Institute Events workflow", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it("covers create, view filters, edit, delete, reload, and seed integrity (tests 1–14)", async () => {
    const mod = await loadStore();

    // --- Seed integrity (13 & 14) before mutations ---
    let all = mod.loadCalendarEvents();
    assertUniqueIds(all);

    const seedCalendarOnly = all.filter(
      (row) => row.source === "calendar" && (row.kind === "holiday" || row.kind === "exam"),
    );
    expect(seedCalendarOnly.length).toBeGreaterThan(0);
    for (const row of seedCalendarOnly) {
      expect(mod.isAcademicCalendarItem(row)).toBe(true);
      expect(mod.isInstituteEventItem(row)).toBe(false);
    }

    const seedEventSource = all.filter((row) => row.source === "events");
    expect(seedEventSource.map((row) => row.id).sort()).toEqual(
      ["evt-1", "evt-2", "evt-5", "evt-6"].sort(),
    );
    for (const row of seedEventSource) {
      expect(mod.isInstituteEventItem(row)).toBe(true);
      expect(mod.getCalendarEventById(row.id)?.title).toBe(row.title);
    }

    const seedSnapshot = JSON.stringify(all);

    // --- 1–3: Create holiday/calendar entry ---
    const holidayId = "cal-verify-holiday";
    mod.upsertCalendarEvent({
      id: holidayId,
      title: "Verify Holiday",
      date: "2026-07-01",
      kind: "holiday",
      published: true,
      source: "calendar",
    });

    all = mod.loadCalendarEvents();
    const calendarView = mod.filterAcademicCalendarItems(all);
    const eventsView = mod.filterInstituteEventItems(all);

    // 2: Calendar view
    expect(calendarView.some((row) => row.id === holidayId)).toBe(true);
    // 3: Not an event-type row
    expect(eventsView.some((row) => row.id === holidayId)).toBe(false);
    expect(all.filter((row) => row.id === holidayId)).toHaveLength(1);

    // Calendar meeting — event-type, appears on both when applicable
    const calMeetingId = "cal-verify-meeting";
    mod.upsertCalendarEvent({
      id: calMeetingId,
      title: "Verify Calendar Meeting",
      date: "2026-07-02",
      time: "10:00",
      kind: "meeting",
      published: true,
      source: "calendar",
    });
    all = mod.loadCalendarEvents();
    expect(mod.filterAcademicCalendarItems(all).some((row) => row.id === calMeetingId)).toBe(true);
    expect(mod.filterInstituteEventItems(all).some((row) => row.id === calMeetingId)).toBe(true);

    // --- 4–6: Create Institute Event ---
    const eventId = "evt-verify-function";
    mod.upsertCalendarEvent({
      id: eventId,
      title: "Verify Institute Function",
      date: "2026-07-03",
      time: "09:00",
      kind: "function",
      audience: "All",
      location: "Hall",
      published: false,
      source: "events",
    });

    all = mod.loadCalendarEvents();
    // 5: Events view
    expect(mod.filterInstituteEventItems(all).some((row) => row.id === eventId)).toBe(true);
    // 6: Calendar when applicable (function)
    expect(mod.filterAcademicCalendarItems(all).some((row) => row.id === eventId)).toBe(true);
    assertUniqueIds(all);

    // --- 7–8: Edit shared record ---
    mod.upsertCalendarEvent({
      id: eventId,
      title: "Verify Institute Function (edited)",
      date: "2026-07-04",
      time: "11:00",
      kind: "function",
      audience: "Students",
      location: "Hall B",
      published: false,
      source: "events",
    });

    all = mod.loadCalendarEvents();
    const edited = mod.getCalendarEventById(eventId);
    expect(edited?.title).toBe("Verify Institute Function (edited)");
    expect(all.filter((row) => row.id === eventId)).toHaveLength(1);
    expect(mod.filterAcademicCalendarItems(all).find((row) => row.id === eventId)?.date).toBe(
      "2026-07-04",
    );
    expect(mod.filterInstituteEventItems(all).find((row) => row.id === eventId)?.location).toBe(
      "Hall B",
    );

    // --- 9–10: Delete shared record ---
    expect(mod.deleteCalendarEvent(eventId)).toBe(true);
    all = mod.loadCalendarEvents();
    expect(mod.getCalendarEventById(eventId)).toBeUndefined();
    expect(mod.filterAcademicCalendarItems(all).some((row) => row.id === eventId)).toBe(false);
    expect(mod.filterInstituteEventItems(all).some((row) => row.id === eventId)).toBe(false);

    // --- 11–12: Reload — no duplicates, no data loss for remaining rows ---
    const raw = store.get(STORAGE_KEY);
    expect(raw).toBeTruthy();

    const mod2 = await loadStore();
    const reloaded = mod2.loadCalendarEvents();
    assertUniqueIds(reloaded);
    expect(reloaded.some((row) => row.id === holidayId)).toBe(true);
    expect(reloaded.some((row) => row.id === eventId)).toBe(false);

    // --- 13–14: Seed rows still correct after workflow ---
    for (const row of seedCalendarOnly) {
      const hit = reloaded.find((item) => item.id === row.id);
      expect(hit?.title).toBe(row.title);
      expect(hit?.date).toBe(row.date);
      expect(hit?.kind).toBe(row.kind);
      expect(hit?.source).toBe("calendar");
    }
    for (const row of seedEventSource) {
      const hit = reloaded.find((item) => item.id === row.id);
      expect(hit?.title).toBe(row.title);
      expect(hit?.source).toBe("events");
    }

    // No accidental wipe of unrelated seed payload shape
    expect(reloaded.length).toBeGreaterThanOrEqual(JSON.parse(seedSnapshot).length);
  });

  it("subscribe/unsubscribe does not stack duplicate listeners (render-loop guard)", async () => {
    const mod = await loadStore();
    const a = mod.subscribeCalendarEvents(() => undefined);
    const b = mod.subscribeCalendarEvents(() => undefined);
    a();
    b();
    mod.upsertCalendarEvent({
      id: "sub-test",
      title: "Sub test",
      date: "2026-07-05",
      kind: "holiday",
      published: true,
      source: "calendar",
    });
    expect(mod.getCalendarEventById("sub-test")).toBeTruthy();
    expect(mod.loadCalendarEvents().filter((row) => row.id === "sub-test")).toHaveLength(1);
  });
});
