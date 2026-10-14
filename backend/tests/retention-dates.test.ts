import { describe, it, expect } from "vitest";
import {
  addCalendarYears,
  reviewEligibleOnFromGraduation,
} from "../src/domains/retention/dates.js";

describe("retention date arithmetic", () => {
  it("adds five calendar years for ordinary dates", () => {
    expect(reviewEligibleOnFromGraduation("2020-06-15")).toBe("2025-06-15");
  });

  it("handles leap-day graduation landing on Feb 28 in non-leap target years", () => {
    expect(addCalendarYears("2020-02-29", 5)).toBe("2025-02-28");
    expect(addCalendarYears("2020-02-29", 4)).toBe("2024-02-29");
  });

  it("preserves month-end boundaries", () => {
    expect(addCalendarYears("2019-01-31", 1)).toBe("2020-01-31");
    expect(addCalendarYears("2019-03-31", 1)).toBe("2020-03-31");
  });
});
