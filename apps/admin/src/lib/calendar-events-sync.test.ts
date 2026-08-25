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

vi.stubGlobal("window", {
  dispatchEvent: vi.fn(() => true),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
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
  return import("./calendar-events-store");
}

describe("calendar events shared sync", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it("keeps one record when calendar creates and events updates by id", async () => {
    const mod = await loadStore();
    const id = "cal-sync-test-1";

    mod.upsertCalendarEvent({
      id,
      title: "Staff planning day",
      date: "2026-07-10",
      kind: "meeting",
      published: true,
      source: "calendar",
    });

    let rows = mod.loadCalendarEvents();
    expect(rows.filter((row) => row.id === id)).toHaveLength(1);
    expect(rows.find((row) => row.id === id)?.source).toBe("calendar");

    mod.upsertCalendarEvent({
      id,
      title: "Staff planning day",
      date: "2026-07-10",
      time: "10:00",
      kind: "meeting",
      audience: "All teachers",
      location: "Hall A",
      published: true,
      source: "calendar",
    });

    rows = mod.loadCalendarEvents();
    expect(rows.filter((row) => row.id === id)).toHaveLength(1);
    expect(rows.find((row) => row.id === id)?.audience).toBe("All teachers");
    expect(rows.find((row) => row.id === id)?.time).toBe("10:00");
  });

  it("reflects events publish in the same shared row", async () => {
    const mod = await loadStore();
    const id = "evt-sync-test-1";

    mod.upsertCalendarEvent({
      id,
      title: "Open house",
      date: "2026-08-01",
      kind: "function",
      published: false,
      source: "events",
    });
    expect(mod.getCalendarEventById(id)?.published).toBe(false);

    mod.publishCalendarEvent(id);
    expect(mod.getCalendarEventById(id)?.published).toBe(true);
    expect(mod.loadCalendarEvents().filter((row) => row.id === id)).toHaveLength(1);
  });

  it("persists merged rows to localStorage for reload", async () => {
    const mod = await loadStore();
    const id = "cal-reload-1";

    mod.upsertCalendarEvent({
      id,
      title: "Unit test week",
      date: "2026-09-01",
      kind: "exam",
      published: true,
      source: "calendar",
    });

    const raw = store.get(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as Array<{ id: string }>;
    expect(parsed.some((row) => row.id === id)).toBe(true);

    const mod2 = await loadStore();
    expect(mod2.getCalendarEventById(id)?.title).toBe("Unit test week");
  });

  it("filters calendar vs events views without duplicating records", async () => {
    const mod = await loadStore();

    mod.upsertCalendarEvent({
      id: "cal-holiday-only",
      title: "Republic Day",
      date: "2026-01-26",
      kind: "holiday",
      published: true,
      source: "calendar",
    });
    mod.upsertCalendarEvent({
      id: "evt-function-only",
      title: "Science fair",
      date: "2026-05-22",
      time: "09:00",
      kind: "function",
      audience: "All grades",
      location: "Auditorium",
      published: true,
      source: "events",
    });
    mod.upsertCalendarEvent({
      id: "shared-meeting",
      title: "Leadership sync",
      date: "2026-06-10",
      time: "16:00",
      kind: "meeting",
      audience: "HoD",
      location: "Boardroom",
      published: true,
      source: "events",
    });

    const all = mod.loadCalendarEvents();
    expect(all.filter((row) => row.id === "shared-meeting")).toHaveLength(1);

    const calendarView = mod.filterAcademicCalendarItems(all);
    const eventsView = mod.filterInstituteEventItems(all);

    expect(calendarView.some((row) => row.id === "cal-holiday-only")).toBe(true);
    expect(eventsView.some((row) => row.id === "cal-holiday-only")).toBe(false);

    expect(eventsView.some((row) => row.id === "evt-function-only")).toBe(true);
    expect(calendarView.some((row) => row.id === "evt-function-only")).toBe(true);

    expect(calendarView.some((row) => row.id === "shared-meeting")).toBe(true);
    expect(eventsView.some((row) => row.id === "shared-meeting")).toBe(true);
  });

  it("propagates cross-view edits to the same shared record", async () => {
    const mod = await loadStore();
    const id = "shared-edit-1";

    mod.upsertCalendarEvent({
      id,
      title: "Leadership sync",
      date: "2026-06-10",
      time: "16:00",
      kind: "meeting",
      audience: "HoD",
      location: "Boardroom",
      published: true,
      source: "events",
    });

    mod.upsertCalendarEvent({
      id,
      title: "Leadership sync (updated)",
      date: "2026-06-11",
      time: "17:00",
      kind: "meeting",
      audience: "HoD",
      location: "Boardroom A",
      published: true,
      source: "events",
    });

    const row = mod.getCalendarEventById(id);
    expect(row?.title).toBe("Leadership sync (updated)");
    expect(row?.date).toBe("2026-06-11");

    const all = mod.loadCalendarEvents();
    expect(all.filter((item) => item.id === id)).toHaveLength(1);
    expect(mod.filterAcademicCalendarItems(all).find((item) => item.id === id)?.title).toBe(
      "Leadership sync (updated)",
    );
    expect(mod.filterInstituteEventItems(all).find((item) => item.id === id)?.location).toBe(
      "Boardroom A",
    );
  });

  it("removes shared records from both views on delete", async () => {
    const mod = await loadStore();
    const id = "shared-delete-1";

    mod.upsertCalendarEvent({
      id,
      title: "Sports meet",
      date: "2026-06-06",
      time: "07:30",
      kind: "function",
      audience: "All grades",
      location: "Field",
      published: true,
      source: "events",
    });

    expect(mod.deleteCalendarEvent(id)).toBe(true);
    expect(mod.getCalendarEventById(id)).toBeUndefined();

    const all = mod.loadCalendarEvents();
    expect(mod.filterAcademicCalendarItems(all).some((row) => row.id === id)).toBe(false);
    expect(mod.filterInstituteEventItems(all).some((row) => row.id === id)).toBe(false);
    expect(mod.deleteCalendarEvent(id)).toBe(false);
  });
});
