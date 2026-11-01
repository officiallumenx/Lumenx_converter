import { describe, expect, it } from "vitest";
import {
  buildClassPeriodsMap,
  isolateClassPeriodUpdate,
  parseClassPeriods,
  periodsForClass,
} from "./class-periods";

describe("subject class periods", () => {
  it("parses and falls back to catalog periods", () => {
    expect(parseClassPeriods({ "6": 4, "7": "5", bad: 0 })).toEqual({
      "6": 4,
      "7": 5,
    });
    expect(periodsForClass({}, "6", 5)).toBe(5);
    expect(periodsForClass({ "6": 4 }, "6", 5)).toBe(4);
  });

  it("isolates updates so changing one class does not rewrite another", () => {
    const previous = { "6": 4, "7": 5, "8": 3 };
    const next = isolateClassPeriodUpdate(previous, "7", 6);
    expect(next).toEqual({ "6": 4, "7": 6, "8": 3 });
    expect(previous).toEqual({ "6": 4, "7": 5, "8": 3 });
  });

  it("builds map only for selected classes", () => {
    expect(
      buildClassPeriodsMap(["6", "8"], { "6": "4", "7": "9", "8": 3 }, 5),
    ).toEqual({ "6": 4, "8": 3 });
  });

  it("rejects invalid period values and keeps siblings intact", () => {
    expect(parseClassPeriods({ "6": 4, "7": -2, "8": 0, "9": "x" })).toEqual({
      "6": 4,
    });
    const previous = { "6": 4, "7": 5 };
    expect(isolateClassPeriodUpdate(previous, "7", 0)).toEqual(previous);
    expect(isolateClassPeriodUpdate(previous, "", 3)).toEqual(previous);
  });

  it("survives round-trip rebuild for independent class values", () => {
    const saved = buildClassPeriodsMap(
      ["6", "7", "8"],
      { "6": 4, "7": 5, "8": 3 },
      5,
    );
    expect(periodsForClass(saved, "6", 5)).toBe(4);
    expect(periodsForClass(saved, "7", 5)).toBe(5);
    expect(periodsForClass(saved, "8", 5)).toBe(3);
    const reopened = parseClassPeriods(saved);
    expect(reopened).toEqual(saved);
  });

  it("UI build falls back for blank/invalid inputs (API still rejects bad writes)", () => {
    // Admin form soft-coerces to catalog default; Zod + assertClassPeriodsForWrite reject at API.
    expect(
      buildClassPeriodsMap(["6", "7"], { "6": "", "7": "not-a-number" }, 5),
    ).toEqual({ "6": 5, "7": 5 });
  });

  it("omits unchecked classes so unknown codes cannot be injected via unchecked rows", () => {
    expect(
      buildClassPeriodsMap(["6"], { "6": 4, "ghost": 99 }, 5),
    ).toEqual({ "6": 4 });
  });
});
