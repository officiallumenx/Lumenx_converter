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

describe("Phase 7 — exams / events / timetable notifications", () => {
  beforeEach(() => {
    memory.clear();
  });

  it("notifies parent, student, teacher when exam timetable is published", async () => {
    const { notifyExamTimetablePublished, listPhase7Inbox } = await import("./index");
    notifyExamTimetablePublished({
      examId: "EX1",
      examName: "Midterm",
      dateRange: "1–5 Mar",
      classLabel: "Grade 10",
    });
    expect(listPhase7Inbox("parent").some((n) => n.id.includes("exam-tt-pub"))).toBe(true);
    expect(listPhase7Inbox("student").some((n) => n.id.includes("exam-tt-pub"))).toBe(true);
    expect(listPhase7Inbox("teacher").some((n) => n.id.includes("exam-tt-pub"))).toBe(true);
  });

  it("sends immediate schedule change and results notifications", async () => {
    const { notifyExamScheduleChange, notifyExamResultsPublished, listPhase7Inbox } =
      await import("./index");
    notifyExamScheduleChange({
      examId: "EX1",
      examName: "Midterm",
      subject: "Math",
      kind: "venue",
      newValue: "Hall B",
    });
    notifyExamResultsPublished({
      examId: "EX1",
      examName: "Midterm",
      subject: "Math",
    });
    expect(listPhase7Inbox("parent").some((n) => n.category === "exams")).toBe(true);
    expect(listPhase7Inbox("student").length).toBeGreaterThan(0);
  });

  it("publishes events to audiences and cancels reminders on cancel", async () => {
    const {
      notifyEventPublished,
      notifyEventCancelled,
      listPhase7Inbox,
      cancelPhase7Reminders,
      PHASE7_INBOX_KEY,
    } = await import("./index");
    notifyEventPublished({
      eventId: "evt-9",
      title: "Sports Day",
      when: "Mar 1 · 9:00",
      venue: "Field",
      audienceLabel: "All grades",
    });
    const before = listPhase7Inbox().filter(
      (n) => n.id.includes("reminder") && n.id.includes("evt-9"),
    );
    expect(before.length).toBeGreaterThan(0);
    notifyEventCancelled({
      eventId: "evt-9",
      title: "Sports Day",
      cancellationReason: "Rain",
      audienceLabel: "All grades",
    });
    const reminders = listPhase7Inbox().filter(
      (n) => n.id.includes("reminder") && n.id.includes("evt-9"),
    );
    expect(reminders.length).toBe(0);
    expect(listPhase7Inbox("parent").some((n) => n.id.includes("evt-cancel"))).toBe(true);
    cancelPhase7Reminders("evt-9");
    expect(localStorage.getItem(PHASE7_INBOX_KEY)).toBeTruthy();
  });

  it("notifies relevant users on timetable publish and important change", async () => {
    const { notifyTimetablePublished, notifyTimetableChanged, listPhase7Inbox } =
      await import("./index");
    notifyTimetablePublished({
      timetableId: "tt-1",
      classLabel: "Grade 10-A",
      termLabel: "Term 1",
    });
    notifyTimetableChanged({
      timetableId: "tt-1",
      classLabel: "Grade 10-A",
      changeSummary: "Period 3 Math moved",
      important: true,
    });
    expect(listPhase7Inbox("teacher").some((n) => n.id.includes("tt-pub"))).toBe(true);
    expect(listPhase7Inbox("parent").some((n) => n.id.includes("tt-chg"))).toBe(true);
  });
});
