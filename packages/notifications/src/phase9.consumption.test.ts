import { beforeEach, describe, expect, it, vi } from "vitest";

const memory = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
  clear: () => memory.clear(),
  key: () => null,
  get length() {
    return memory.size;
  },
});

describe("Phase 9 — consumption, deep links, dedupe", () => {
  beforeEach(() => {
    memory.clear();
  });

  it("keeps one stable id per event across audiences", async () => {
    const { notifyEventPublished, listPhase7Inbox } = await import("./index");
    notifyEventPublished({
      eventId: "evt-stable",
      title: "Sports Day",
      when: "Tomorrow",
      venue: "Field",
      audienceLabel: "All grades",
    });
    const all = listPhase7Inbox();
    const pubs = all.filter((n) => n.id === "evt-pub-evt-stable");
    expect(pubs).toHaveLength(1);
    expect(pubs[0]?.audiences?.length).toBeGreaterThan(1);
    expect(listPhase7Inbox("parent").some((n) => n.id === "evt-pub-evt-stable")).toBe(true);
    expect(listPhase7Inbox("student").some((n) => n.id === "evt-pub-evt-stable")).toBe(true);
  });

  it("dedupes by id and restores missing hrefs", async () => {
    const { dedupeNotificationsById, ensureNotificationHref } = await import("./index");
    const rows = dedupeNotificationsById([
      {
        id: "a1",
        title: "Absent",
        desc: "Today",
        time: "now",
        type: "warning",
        category: "attendance",
        unread: true,
      },
      {
        id: "a1",
        title: "Absent duplicate",
        desc: "Today",
        time: "now",
        type: "warning",
        category: "attendance",
        unread: true,
        href: "/attendance",
      },
      {
        id: "f1",
        title: "Fee due",
        desc: "Pay",
        time: "now",
        type: "info",
        category: "fees",
        unread: true,
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.href).toBe("/attendance");
    expect(ensureNotificationHref(rows[1]!).href).toBe("/fees");
  });

  it("exam timetable publish uses one id for parent/student/teacher", async () => {
    const { notifyExamTimetablePublished, listPhase7Inbox } = await import("./index");
    notifyExamTimetablePublished({
      examId: "EX9",
      examName: "Finals",
      dateRange: "1–5 Mar",
    });
    const matches = listPhase7Inbox().filter((n) => n.id === "exam-tt-pub-EX9");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.href).toBe("/exams");
  });
});
