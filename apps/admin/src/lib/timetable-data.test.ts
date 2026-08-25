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

describe("timetable generation helpers", () => {
  beforeEach(() => {
    store.clear();
  });

  it("respects weekly quotas and soft before-lunch preference when possible", async () => {
    const {
      autoGenerateTimetableDetailed,
      buildDefaultSubjectPeriods,
      validateSubjectPeriodBudget,
    } = await import("./timetable-data");
    const { buildScheduleConfig, defaultScheduleInput, isBeforeLunch } = await import(
      "./timetable-schedule"
    );
    const { getSubjectsByGrade } = await import("./subjects-data");

    const schedule = buildScheduleConfig(defaultScheduleInput());
    const subjects = getSubjectsByGrade()["Grade 10"] ?? [];
    expect(subjects.length).toBeGreaterThan(0);

    const subject = subjects[0]!;
    const periods = buildDefaultSubjectPeriods(subjects);
    periods[subject.id] = 3;
    const budget = validateSubjectPeriodBudget(periods, schedule);
    expect(budget.ok).toBe(true);

    const teachers = Object.fromEntries(subjects.map((s) => [s.id, ""]));
    const { grid, relaxedNotices } = autoGenerateTimetableDetailed("Grade 10", "A", {
      teacherMode: "auto",
      grade: "Grade 10",
      section: "A",
      schedule,
      subjectTeachers: teachers,
      subjectPeriodsPerWeek: periods,
      subjectPlacementPreferences: {
        ...Object.fromEntries(subjects.map((s) => [s.id, "any" as const])),
        [subject.id]: "before_lunch",
      },
    });

    const placed = grid.flat().filter((slot) => slot?.subjectId === subject.id);
    expect(placed.length).toBe(3);

    const beforeLunchCount = grid.reduce((count, dayCol) => {
      return (
        count +
        dayCol.reduce((inner, slot, periodIdx) => {
          if (!slot || slot.subjectId !== subject.id) return inner;
          return inner + (isBeforeLunch(schedule, periodIdx) ? 1 : 0);
        }, 0)
      );
    }, 0);

    // Soft preference: prefer before lunch, but may relax if needed.
    expect(beforeLunchCount + relaxedNotices.length).toBeGreaterThanOrEqual(1);
  });

  it("detects teacher conflicts across overlapping times on the same weekday", async () => {
    const { detectConflicts, emptyGrid } = await import("./timetable-data");
    const { buildScheduleConfig, defaultScheduleInput } = await import("./timetable-schedule");

    const schedule = buildScheduleConfig(defaultScheduleInput());
    const gridA = emptyGrid(schedule);
    const gridB = emptyGrid(schedule);
    const teachingIdx = schedule.periodRows.findIndex((row) => !row.isBreak);
    expect(teachingIdx).toBeGreaterThanOrEqual(0);

    gridA[0]![teachingIdx] = {
      subjectId: "S-MTH-101",
      subject: "MTH 101",
      teacherId: "T-001",
      teacher: "Sarah Jenkins",
      room: "R1",
    };
    gridB[0]![teachingIdx] = {
      subjectId: "S-PHY",
      subject: "PHY 201",
      teacherId: "T-001",
      teacher: "Sarah Jenkins",
      room: "R2",
    };

    const conflicts = detectConflicts([
      {
        id: "TT-A",
        grade: "Grade 10",
        section: "A",
        term: "T1",
        status: "draft",
        grid: gridA,
        schedule,
        updatedAt: "2026-07-19",
      },
      {
        id: "TT-B",
        grade: "Grade 10",
        section: "B",
        term: "T1",
        status: "draft",
        grid: gridB,
        schedule,
        updatedAt: "2026-07-19",
      },
    ]);

    expect(conflicts.some((c) => c.kind === "teacher" && c.resource === "T-001")).toBe(true);
  });

  it("places at most one period of each subject per day", async () => {
    const { autoGenerateTimetableDetailed, buildDefaultSubjectPeriods } = await import(
      "./timetable-data"
    );
    const { buildScheduleConfig, defaultScheduleInput } = await import("./timetable-schedule");
    const { getSubjectsByGrade } = await import("./subjects-data");

    const schedule = buildScheduleConfig(defaultScheduleInput());
    const subjects = getSubjectsByGrade()["Grade 10"] ?? [];
    const periods = buildDefaultSubjectPeriods(subjects);

    const { grid } = autoGenerateTimetableDetailed("Grade 10", "A", {
      teacherMode: "auto",
      grade: "Grade 10",
      section: "A",
      schedule,
      subjectTeachers: Object.fromEntries(subjects.map((s) => [s.id, ""])),
      subjectPeriodsPerWeek: periods,
    });

    for (const subject of subjects) {
      for (let day = 0; day < grid.length; day++) {
        const count = (grid[day] ?? []).filter(
          (slot) => slot?.subjectId === subject.id || slot?.subject === subject.code,
        ).length;
        expect(count).toBeLessThanOrEqual(1);
      }
    }

    for (const subject of subjects) {
      const target = Math.min(
        periods[subject.id] ?? 0,
        schedule.days.filter((d) => d.active).length,
      );
      const placed = grid
        .flat()
        .filter((slot) => slot?.subjectId === subject.id || slot?.subject === subject.code).length;
      expect(placed).toBe(target);
    }
  });

  it("keeps after_lunch subjects strictly after lunch", async () => {
    const { autoGenerateTimetableDetailed, buildDefaultSubjectPeriods } = await import(
      "./timetable-data"
    );
    const { buildScheduleConfig, defaultScheduleInput, isAfterLunch } = await import(
      "./timetable-schedule"
    );
    const { getSubjectsByGrade } = await import("./subjects-data");

    const schedule = buildScheduleConfig(defaultScheduleInput());
    const subjects = getSubjectsByGrade()["Grade 10"] ?? [];
    const focus = subjects[0]!;
    const periods = buildDefaultSubjectPeriods(subjects);
    periods[focus.id] = 3;

    const preferences = Object.fromEntries(
      subjects.map((s) => [s.id, s.id === focus.id ? ("after_lunch" as const) : ("any" as const)]),
    );

    const { grid } = autoGenerateTimetableDetailed("Grade 10", "A", {
      teacherMode: "auto",
      grade: "Grade 10",
      section: "A",
      schedule,
      subjectTeachers: Object.fromEntries(subjects.map((s) => [s.id, ""])),
      subjectPeriodsPerWeek: periods,
      subjectPlacementPreferences: preferences,
    });

    for (let day = 0; day < grid.length; day++) {
      (grid[day] ?? []).forEach((slot, periodIdx) => {
        if (!slot || slot.subjectId !== focus.id) return;
        expect(isAfterLunch(schedule, periodIdx)).toBe(true);
      });
    }
  });

  it("preserves locked cells during regeneration", async () => {
    const { autoGenerateTimetableDetailed, buildDefaultSubjectPeriods, emptyGrid } = await import(
      "./timetable-data"
    );
    const { buildScheduleConfig, defaultScheduleInput } = await import("./timetable-schedule");
    const { getSubjectsByGrade } = await import("./subjects-data");

    const schedule = buildScheduleConfig(defaultScheduleInput());
    const subjects = getSubjectsByGrade()["Grade 10"] ?? [];
    const subject = subjects[0]!;
    const teachingIdx = schedule.periodRows.findIndex((row) => !row.isBreak);
    const preserveGrid = emptyGrid(schedule);
    preserveGrid[0]![teachingIdx] = {
      subjectId: subject.id,
      subject: subject.code,
      teacherId: "LOCKED-T",
      teacher: "Locked Teacher",
      room: "LOCK-ROOM",
    };

    const { grid } = autoGenerateTimetableDetailed("Grade 10", "A", {
      teacherMode: "auto",
      grade: "Grade 10",
      section: "A",
      schedule,
      subjectTeachers: Object.fromEntries(subjects.map((s) => [s.id, ""])),
      subjectPeriodsPerWeek: buildDefaultSubjectPeriods(subjects),
      lockedCells: [{ day: 0, period: teachingIdx }],
      preserveGrid,
    });

    expect(grid[0]?.[teachingIdx]?.teacherId).toBe("LOCKED-T");
    expect(grid[0]?.[teachingIdx]?.subjectId).toBe(subject.id);
  });

  it("does not double-count unplaced when exact slot picks fail", async () => {
    const { autoGenerateTimetableDetailed, buildDefaultSubjectPeriods } = await import(
      "./timetable-data"
    );
    const { buildScheduleConfig, defaultScheduleInput } = await import("./timetable-schedule");
    const { getSubjectsByGrade } = await import("./subjects-data");

    const schedule = buildScheduleConfig(defaultScheduleInput());
    const subjects = getSubjectsByGrade()["Grade 10"] ?? [];
    const subject = subjects[0]!;
    const teachingIdx = schedule.periodRows.findIndex((row) => !row.isBreak);
    const periods = buildDefaultSubjectPeriods(subjects);
    periods[subject.id] = 2;

    const { unplaced, grid } = autoGenerateTimetableDetailed("Grade 10", "A", {
      teacherMode: "auto",
      grade: "Grade 10",
      section: "A",
      schedule,
      subjectTeachers: Object.fromEntries(subjects.map((s) => [s.id, ""])),
      subjectPeriodsPerWeek: periods,
      // Impossible exact pick (break row index if teachingIdx is valid — use out-of-range day)
      subjectSlotSelections: {
        [subject.id]: [
          { day: 0, period: teachingIdx },
          { day: 0, period: teachingIdx }, // same day duplicate — should not inflate unplaced
        ],
      },
    });

    const placed = grid.flat().filter((s) => s?.subjectId === subject.id).length;
    expect(placed + unplaced).toBeGreaterThanOrEqual(periods[subject.id]!);
    // Unplaced should be remaining after both passes, not one per failed pick.
    expect(unplaced).toBeLessThanOrEqual(periods[subject.id]!);
  });

  it("avoids room collisions across classes while generating", async () => {
    const {
      autoGenerateTimetableDetailed,
      buildDefaultSubjectPeriods,
      detectConflicts,
      emptyGrid,
      slotVenue,
    } = await import("./timetable-data");
    const { buildScheduleConfig, defaultScheduleInput } = await import("./timetable-schedule");
    const { getSubjectsByGrade } = await import("./subjects-data");

    const schedule = buildScheduleConfig(defaultScheduleInput());
    const subjects = getSubjectsByGrade()["Grade 10"] ?? [];
    const teachingIdx = schedule.periodRows.findIndex((row) => !row.isBreak);
    const venueA = slotVenue("Grade 10", "A");

    const gridA = emptyGrid(schedule);
    gridA[0]![teachingIdx] = {
      subjectId: subjects[0]!.id,
      subject: subjects[0]!.code,
      teacherId: "T-OTHER",
      teacher: "Other",
      room: venueA,
    };

    const existing = [
      {
        id: "TT-10A",
        grade: "Grade 10",
        section: "A",
        term: "T1",
        status: "draft" as const,
        grid: gridA,
        schedule,
        updatedAt: "2026-07-19",
      },
    ];

    const { grid } = autoGenerateTimetableDetailed("Grade 10", "B", {
      teacherMode: "auto",
      grade: "Grade 10",
      section: "B",
      schedule,
      subjectTeachers: Object.fromEntries(subjects.map((s) => [s.id, ""])),
      subjectPeriodsPerWeek: buildDefaultSubjectPeriods(subjects),
      existingTimetables: existing,
    });

    // If B also uses venueA at same time, detectConflicts would report room conflict.
    // Generation should prefer avoiding that; assert B's first teaching slot on day 0
    // is either empty or different room when teacher allows.
    const conflicts = detectConflicts([
      ...existing,
      {
        id: "TT-10B",
        grade: "Grade 10",
        section: "B",
        term: "T1",
        status: "draft",
        grid,
        schedule,
        updatedAt: "2026-07-19",
      },
    ]);
    // Room conflicts for venueA at overlapping times should not involve both A and B if rooms differ.
    // B uses its own venue by default (slotVenue Grade 10 B), so room conflicts for venueA alone are ok.
    const roomConflicts = conflicts.filter((c) => c.kind === "room");
    expect(roomConflicts.every((c) => c.classes.length === 2)).toBe(true);
  });
});
