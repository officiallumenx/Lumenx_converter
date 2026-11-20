import { describe, expect, it } from "vitest";
import {
  assertClassPeriodsForWrite,
  normalizeClassPeriodsForRead,
  uniqueClassCodes,
} from "./class-periods.js";

describe("class periods write/read integrity", () => {
  it("documents write contract: null/missing/empty are compatible no-ops", () => {
    expect(assertClassPeriodsForWrite(null)).toEqual({});
    expect(assertClassPeriodsForWrite(undefined)).toEqual({});
    expect(assertClassPeriodsForWrite({})).toEqual({});
  });

  it("rejects invalid write values instead of silently dropping them", () => {
    expect(() => assertClassPeriodsForWrite({ "6": 0 })).toThrow(/1 to 40/i);
    expect(() => assertClassPeriodsForWrite({ "6": -1 })).toThrow(/1 to 40/i);
    expect(() => assertClassPeriodsForWrite({ "6": 41 })).toThrow(/1 to 40/i);
    expect(() => assertClassPeriodsForWrite({ "6": 4.5 })).toThrow(/1 to 40/i);
    expect(() =>
      assertClassPeriodsForWrite({ "6": "abc" as unknown as number }),
    ).toThrow(/1 to 40/i);
    expect(() => assertClassPeriodsForWrite({ "": 4 })).toThrow(/non-empty/i);
    expect(() => assertClassPeriodsForWrite(["6", 4] as unknown as Record<string, number>)).toThrow(
      /object map/i,
    );
  });

  it("coerces numeric strings that are whole integers in range", () => {
    expect(
      assertClassPeriodsForWrite({ "6": "4" as unknown as number }),
    ).toEqual({ "6": 4 });
  });

  it("accepts independent per-class integers and leaves siblings intact", () => {
    expect(assertClassPeriodsForWrite({ "6": 4, "7": 5, "8": 3 })).toEqual({
      "6": 4,
      "7": 5,
      "8": 3,
    });
  });

  it("strips dirty legacy values only on read path", () => {
    expect(
      normalizeClassPeriodsForRead({
        "6": 4,
        bad: 0,
        "8": -1,
      } as Record<string, number>),
    ).toEqual({ "6": 4 });
  });

  it("deduplicates applicable class codes without inventing values", () => {
    expect(uniqueClassCodes(["6", " 6 ", "7", "", "7"])).toEqual(["6", "7"]);
  });
});
