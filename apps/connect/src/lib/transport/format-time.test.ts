import { describe, expect, it } from "vitest";
import { formatExpectedPickupLabel, formatTransportInstant } from "./format-time";

describe("formatTransportInstant", () => {
  it("formats ISO timestamps and rejects invalid values", () => {
    const label = formatTransportInstant("2026-11-01T08:05:00.000Z", {
      timeZone: "UTC",
      locale: "en-GB",
    });
    expect(label).toMatch(/8:05/);
    expect(formatTransportInstant(null)).toBeNull();
    expect(formatTransportInstant("not-a-date")).toBeNull();
  });

  it("keeps midnight boundary readable in a fixed zone", () => {
    const label = formatTransportInstant("2026-11-01T00:00:00.000Z", {
      timeZone: "UTC",
      locale: "en-GB",
    });
    expect(label).toMatch(/12:00|00:00|0:00/);
  });
});

describe("formatExpectedPickupLabel", () => {
  it("distinguishes missing stop, unscheduled, and institute default HH:MM", () => {
    expect(formatExpectedPickupLabel("07:30", false)).toBe("Stop not assigned");
    expect(formatExpectedPickupLabel(null, true)).toBe("Not scheduled");
    expect(formatExpectedPickupLabel("07:30:00", true)).toBe("Institute default · 07:30");
    expect(formatExpectedPickupLabel("Around 8", true)).toBe("Around 8");
  });
});
