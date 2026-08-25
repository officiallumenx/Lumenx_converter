import { describe, expect, it } from "vitest";
import {
  buildScheduleConfig,
  buildUniformBellItems,
  defaultScheduleInput,
  isAfterLunch,
  isBeforeLunch,
  lunchRowIndex,
  timesOverlap,
  validateBellItems,
  teachingSlotsForSchedule,
  rebuildBellItemsFromUniform,
} from "./timetable-schedule";

describe("timetable-schedule", () => {
  it("builds a uniform bell schedule with lunch between teaching periods", () => {
    const config = buildScheduleConfig(defaultScheduleInput());
    const lunchIdx = lunchRowIndex(config);
    expect(lunchIdx).toBeGreaterThan(0);
    expect(config.periodRows[lunchIdx]?.isBreak).toBe(true);
    expect(config.periodRows.filter((r) => !r.isBreak)).toHaveLength(7);
    expect(teachingSlotsForSchedule(config).length).toBe(42);
  });

  it("supports individually timed periods and multiple named breaks", () => {
    const input = rebuildBellItemsFromUniform({
      ...defaultScheduleInput(),
      defaultPeriodsPerDay: 5,
      lunchEnabled: true,
      lunchAfterPeriod: 2,
    });
    input.bellItems = [
      { id: "P1", kind: "period", label: "P1", start: "08:00", end: "08:45" },
      { id: "B1", kind: "break", label: "Morning Break", start: "08:45", end: "09:00" },
      { id: "P2", kind: "period", label: "P2", start: "09:00", end: "09:45" },
      { id: "L1", kind: "break", label: "Lunch", start: "09:45", end: "10:30" },
      { id: "P3", kind: "period", label: "P3", start: "10:30", end: "11:15" },
    ];
    const config = buildScheduleConfig(input);
    expect(config.periodRows.filter((r) => r.isBreak)).toHaveLength(2);
    expect(config.periodRows.find((r) => r.breakName === "Morning Break")).toBeTruthy();
    expect(isBeforeLunch(config, 0)).toBe(true);
    expect(isAfterLunch(config, 4)).toBe(true);
  });

  it("validates overlapping and inverted times", () => {
    const issues = validateBellItems([
      { id: "P1", kind: "period", label: "P1", start: "08:00", end: "09:00" },
      { id: "P2", kind: "period", label: "P2", start: "08:30", end: "09:30" },
      { id: "P3", kind: "period", label: "P3", start: "10:00", end: "09:00" },
    ]);
    expect(issues.some((i) => i.severity === "error" && i.message.includes("overlaps"))).toBe(
      true,
    );
    expect(issues.some((i) => i.message.includes("end time must be after"))).toBe(true);
  });

  it("detects overlapping time ranges for conflict checks", () => {
    expect(timesOverlap("08:00", "09:00", "08:30", "09:30")).toBe(true);
    expect(timesOverlap("08:00", "09:00", "09:00", "10:00")).toBe(false);
  });

  it("rebuilds uniform items from start time and duration", () => {
    const items = buildUniformBellItems({
      startTime: "09:00",
      periodDurationMins: 40,
      periodsPerDay: 3,
      lunchEnabled: true,
      lunchAfterPeriod: 1,
      lunchDurationMins: 20,
    });
    expect(items.map((i) => i.kind)).toEqual(["period", "break", "period", "period"]);
    expect(items[0]?.start).toBe("09:00");
    expect(items[1]?.label).toBe("Lunch");
    expect(items[2]?.start).toBe("10:00");
  });
});
