import { describe, expect, it } from "vitest";
import {
  DEFAULT_CALENDAR_HOLIDAY_RULES,
  generateRuleHolidays,
  ruleHolidayLabel,
} from "./calendar-holiday-rules";
import { goodFridayIso, isSecondSaturday, isSunday } from "./exam-calendar-utils";

describe("calendar holiday rules", () => {
  it("marks Sundays, second Saturdays, Good Friday, and festivals when enabled", () => {
    const rules = DEFAULT_CALENDAR_HOLIDAY_RULES;
    expect(ruleHolidayLabel("2026-10-04", rules)).toBe("Sunday");
    expect(isSunday("2026-10-04")).toBe(true);
    expect(isSecondSaturday("2026-10-10")).toBe(true);
    expect(ruleHolidayLabel("2026-10-10", rules)).toBe("Second Saturday");
    expect(ruleHolidayLabel(goodFridayIso(2026), rules)).toBe("Good Friday");
    expect(ruleHolidayLabel("2026-08-15", rules)).toBe("Independence Day");
    expect(ruleHolidayLabel("2026-01-14", rules)).toBe("Sankranti");
    expect(ruleHolidayLabel("2026-03-19", rules)).toBe("Ugadi");
    expect(ruleHolidayLabel("2026-09-14", rules)).toBe("Vinayaka Chaviti");
    expect(ruleHolidayLabel("2026-10-20", rules)).toBe("Dasara");
    expect(ruleHolidayLabel("2026-11-08", rules)).toBe("Diwali");
  });

  it("omits a type when the checklist is off", () => {
    const none = {
      sundays: false,
      secondSaturdays: false,
      goodFridays: false,
      festivals: false,
    };
    expect(ruleHolidayLabel("2026-10-04", none)).toBeNull();
    expect(ruleHolidayLabel("2026-08-15", none)).toBeNull();
    expect(generateRuleHolidays(2026, none, []).length).toBe(0);
  });

  it("generates Sundays for the year and skips dates that already have a holiday", () => {
    const onlySundays = {
      sundays: true,
      secondSaturdays: false,
      goodFridays: false,
      festivals: false,
    };
    const generated = generateRuleHolidays(2026, onlySundays, [
      { id: "x", title: "Custom", date: "2026-10-04", kind: "holiday" },
    ]);
    expect(generated.some((row) => row.date === "2026-10-04")).toBe(false);
    expect(generated.every((row) => row.kind === "holiday" && row.source === "rule")).toBe(true);
    expect(generated.length).toBeGreaterThan(40);
  });
});
