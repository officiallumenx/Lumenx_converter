import { describe, expect, it } from "vitest";
import {
  DEFAULT_INSTITUTE_TIMEZONE,
  todayInTimeZone,
  toIsoDateInTimeZone,
  todayUtcIso,
} from "./date";

describe("toIsoDateInTimeZone", () => {
  it("defaults to Asia/Kolkata", () => {
    expect(DEFAULT_INSTITUTE_TIMEZONE).toBe("Asia/Kolkata");
  });

  it("uses institute calendar day near UTC midnight (IST already next day)", () => {
    // 2026-03-15 18:30 UTC == 2026-03-16 00:00 IST
    const utcNearIstMidnight = new Date("2026-03-15T18:30:00.000Z");
    expect(todayUtcIso(utcNearIstMidnight)).toBe("2026-03-15");
    expect(toIsoDateInTimeZone(utcNearIstMidnight, "Asia/Kolkata")).toBe(
      "2026-03-16",
    );
  });

  it("matches UTC calendar day for UTC timezone", () => {
    const noonUtc = new Date("2026-06-01T12:00:00.000Z");
    expect(toIsoDateInTimeZone(noonUtc, "UTC")).toBe("2026-06-01");
    expect(todayUtcIso(noonUtc)).toBe("2026-06-01");
  });

  it("rolls to previous IST day before local midnight while UTC is next day", () => {
    // 2026-03-16 00:30 UTC == 2026-03-16 06:00 IST (same day)
    const midMorningIst = new Date("2026-03-16T00:30:00.000Z");
    expect(toIsoDateInTimeZone(midMorningIst, "Asia/Kolkata")).toBe(
      "2026-03-16",
    );

    // 2026-03-15 18:00 UTC == 2026-03-15 23:30 IST (still 15th IST)
    const beforeIstMidnight = new Date("2026-03-15T18:00:00.000Z");
    expect(toIsoDateInTimeZone(beforeIstMidnight, "Asia/Kolkata")).toBe(
      "2026-03-15",
    );
    expect(todayUtcIso(beforeIstMidnight)).toBe("2026-03-15");
  });

  it("todayInTimeZone delegates to toIsoDateInTimeZone", () => {
    const fixed = new Date("2026-01-01T02:00:00.000Z");
    expect(todayInTimeZone("Asia/Kolkata", fixed)).toBe(
      toIsoDateInTimeZone(fixed, "Asia/Kolkata"),
    );
  });

  it("falls back when timezone is blank", () => {
    const d = new Date("2026-03-15T18:30:00.000Z");
    expect(toIsoDateInTimeZone(d, "   ")).toBe(
      toIsoDateInTimeZone(d, DEFAULT_INSTITUTE_TIMEZONE),
    );
  });
});
