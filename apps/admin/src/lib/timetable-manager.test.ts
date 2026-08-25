import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
});

vi.mock("@lumenx/types", async () => {
  const actual = await vi.importActual<typeof import("@lumenx/types")>("@lumenx/types");
  return {
    ...actual,
    readDemoProfileId: () => "single_institute",
  };
});

describe("timetable manager helpers", () => {
  beforeEach(() => {
    store.clear();
  });

  it("sanitizes stale exact-slot selections when lunch preference changes", async () => {
    const { sanitizeSubjectSlotSelections } = await import("./timetable-manager");
    const { buildScheduleConfig, defaultScheduleInput, isBeforeLunch, isAfterLunch } = await import(
      "./timetable-schedule"
    );

    const schedule = buildScheduleConfig(defaultScheduleInput());
    const before = schedule.periodRows.findIndex(
      (row, idx) => !row.isBreak && isBeforeLunch(schedule, idx),
    );
    const after = schedule.periodRows.findIndex(
      (row, idx) => !row.isBreak && isAfterLunch(schedule, idx),
    );
    expect(before).toBeGreaterThanOrEqual(0);
    expect(after).toBeGreaterThanOrEqual(0);

    const cleaned = sanitizeSubjectSlotSelections(
      {
        "S-1": [
          { day: 0, period: before },
          { day: 1, period: after },
        ],
      },
      schedule,
      { "S-1": "before_lunch" },
    );

    expect(cleaned["S-1"]).toEqual([{ day: 0, period: before }]);
  });

  it("rejects manual placement that violates one-subject-per-day", async () => {
    const { validateCellPlacement } = await import("./timetable-manager");
    const { emptyGrid } = await import("./timetable-data");
    const { buildScheduleConfig, defaultScheduleInput } = await import("./timetable-schedule");

    const schedule = buildScheduleConfig(defaultScheduleInput());
    const teaching = schedule.periodRows
      .map((row, idx) => ({ row, idx }))
      .filter((x) => !x.row.isBreak);
    expect(teaching.length).toBeGreaterThan(1);

    const grid = emptyGrid(schedule);
    const p0 = teaching[0]!.idx;
    const p1 = teaching[1]!.idx;
    grid[0]![p0] = {
      subjectId: "S-MTH",
      subject: "MTH",
      teacherId: "T-1",
      teacher: "A",
      room: "R1",
    };

    const result = validateCellPlacement({
      grid,
      schedule,
      day: 0,
      period: p1,
      subjectId: "S-MTH",
      subjectCode: "MTH",
      teacherId: "T-2",
      room: "R1",
      preference: "any",
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/one period/i);
  });

  it("flags impossible before-lunch preference capacity", async () => {
    const { validatePreferenceCapacity } = await import("./timetable-manager");
    const { buildScheduleConfig, defaultScheduleInput, countSlotsMatchingPreference } =
      await import("./timetable-schedule");

    const schedule = buildScheduleConfig(defaultScheduleInput());
    const beforeCap = countSlotsMatchingPreference(schedule, "before_lunch");

    const result = validatePreferenceCapacity(
      { a: beforeCap + 5 },
      { a: "before_lunch" },
      schedule,
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Before-lunch/);
  });

  it("builds a publish checklist with readiness states", async () => {
    const { evaluatePublishReadiness, getTimetableReadiness } = await import("./timetable-manager");
    const { emptyGrid } = await import("./timetable-data");
    const { buildScheduleConfig, defaultScheduleInput } = await import("./timetable-schedule");

    const schedule = buildScheduleConfig(defaultScheduleInput());
    const record = {
      id: "TT-X",
      grade: "Grade 10",
      section: "Z",
      term: "T1",
      status: "draft" as const,
      grid: emptyGrid(schedule),
      schedule,
      updatedAt: "2026-07-19",
    };

    const report = evaluatePublishReadiness(record, [record]);
    expect(report.canPublish).toBe(false);
    expect(report.checklist.some((item) => item.id === "filled" && !item.ok)).toBe(true);
    expect(getTimetableReadiness(record, [record])).toBe("incomplete");
  });
});
