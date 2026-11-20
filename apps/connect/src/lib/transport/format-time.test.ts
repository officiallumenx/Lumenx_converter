import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRANSPORT_TIMEZONE,
  formatExpectedPickupLabel,
  formatTransportDate,
  formatTransportDateTime,
  formatTransportInstant,
  resolveTransportTimeZone,
} from "./format-time";

describe("resolveTransportTimeZone", () => {
  it("defaults to Asia/Kolkata when timezone is undefined, null, or empty", () => {
    expect(resolveTransportTimeZone()).toBe(DEFAULT_TRANSPORT_TIMEZONE);
    expect(resolveTransportTimeZone(null)).toBe(DEFAULT_TRANSPORT_TIMEZONE);
    expect(resolveTransportTimeZone("")).toBe(DEFAULT_TRANSPORT_TIMEZONE);
    expect(resolveTransportTimeZone("   ")).toBe(DEFAULT_TRANSPORT_TIMEZONE);
  });

  it("accepts valid IANA timezones", () => {
    expect(resolveTransportTimeZone("Asia/Kolkata")).toBe("Asia/Kolkata");
    expect(resolveTransportTimeZone("America/New_York")).toBe("America/New_York");
    expect(resolveTransportTimeZone("Europe/London")).toBe("Europe/London");
    expect(resolveTransportTimeZone("Asia/Dubai")).toBe("Asia/Dubai");
  });

  it("safely falls back to Asia/Kolkata on invalid timezone identifiers", () => {
    expect(resolveTransportTimeZone("Invalid/Zone")).toBe(DEFAULT_TRANSPORT_TIMEZONE);
    expect(resolveTransportTimeZone("foo_bar")).toBe(DEFAULT_TRANSPORT_TIMEZONE);
  });
});

describe("formatTransportInstant", () => {
  it("formats ISO timestamps with default fallback to Asia/Kolkata (IST: UTC+5:30)", () => {
    // 02:30:00 UTC is 08:00 AM IST
    const label = formatTransportInstant("2026-11-09T02:30:00.000Z");
    expect(label).toMatch(/8:00\s*(AM|am)?/i);
  });

  it("requirement 1: UTC timestamp correctly displayed in India", () => {
    // 04:30:00 UTC is 10:00 AM IST
    const label = formatTransportInstant("2026-11-14T04:30:00.000Z", {
      timeZone: "Asia/Kolkata",
    });
    expect(label).toMatch(/10:00\s*(AM|am)?/i);
  });

  it("requirement 2: timestamp already containing an offset is not converted twice", () => {
    // 10:00:00+05:30 is 10:00 AM in Asia/Kolkata (must not add another 5:30 to become 3:30 PM)
    const label = formatTransportInstant("2026-11-14T10:00:00+05:30", {
      timeZone: "Asia/Kolkata",
    });
    expect(label).toMatch(/10:00\s*(AM|am)?/i);
  });

  it("requirement 3: missing timezone information handled consistently according to API contract (UTC DB timestamps)", () => {
    // Postgres timestamp without offset: '2026-11-14T04:30:00' -> parsed as UTC -> 10:00 AM IST
    const isoWithoutTz = formatTransportInstant("2026-11-14T04:30:00", {
      timeZone: "Asia/Kolkata",
    });
    expect(isoWithoutTz).toMatch(/10:00\s*(AM|am)?/i);

    // Postgres string with space '2026-11-14 04:30:00' -> parsed as UTC -> 10:00 AM IST
    const spaceSeparated = formatTransportInstant("2026-11-14 04:30:00", {
      timeZone: "Asia/Kolkata",
    });
    expect(spaceSeparated).toMatch(/10:00\s*(AM|am)?/i);
  });

  it("formats ISO timestamps in explicit timezones", () => {
    const iso = "2026-11-09T02:30:00.000Z";
    // In UTC, 02:30:00Z is 2:30 AM
    expect(formatTransportInstant(iso, { timeZone: "UTC", locale: "en-US" })).toMatch(/2:30\s*AM/);
    // In America/New_York (EST: UTC-5), 02:30 UTC Nov 9 is 9:30 PM Nov 8
    expect(formatTransportInstant(iso, { timeZone: "America/New_York", locale: "en-US" })).toMatch(/9:30\s*PM/);
    // In Asia/Dubai (UTC+4), 02:30 UTC is 6:30 AM
    expect(formatTransportInstant(iso, { timeZone: "Asia/Dubai", locale: "en-US" })).toMatch(/6:30\s*AM/);
  });

  it("handles DST differences correctly in America/New_York", () => {
    // Summer (EDT: UTC-4): July 15, 12:00:00Z -> 8:00 AM EDT
    const summer = "2026-07-15T12:00:00.000Z";
    expect(formatTransportInstant(summer, { timeZone: "America/New_York", locale: "en-US" })).toMatch(/8:00\s*AM/);

    // Winter (EST: UTC-5): Jan 15, 12:00:00Z -> 7:00 AM EST
    const winter = "2026-01-15T12:00:00.000Z";
    expect(formatTransportInstant(winter, { timeZone: "America/New_York", locale: "en-US" })).toMatch(/7:00\s*AM/);
  });

  it("rejects null, empty, and invalid dates", () => {
    expect(formatTransportInstant(null)).toBeNull();
    expect(formatTransportInstant(undefined)).toBeNull();
    expect(formatTransportInstant("")).toBeNull();
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

describe("formatTransportDate", () => {
  it("formats pure YYYY-MM-DD date strings without UTC midnight shift across timezones", () => {
    const dateStr = "2026-11-09";
    // In America/New_York (UTC-5), an unanchored UTC date would slip to Nov 8.
    // Our formatTransportDate must preserve Nov 9!
    const nyFormatted = formatTransportDate(dateStr, { timeZone: "America/New_York" });
    expect(nyFormatted).toContain("Nov 9, 2026");

    const kolkataFormatted = formatTransportDate(dateStr, { timeZone: "Asia/Kolkata" });
    expect(kolkataFormatted).toContain("Nov 9, 2026");

    const utcFormatted = formatTransportDate(dateStr, { timeZone: "UTC" });
    expect(utcFormatted).toContain("Nov 9, 2026");
  });

  it("supports relative dates ('Today' and 'Yesterday')", () => {
    const now = new Date();
    // Compute today's YYYY-MM-DD in Asia/Kolkata
    const todayKolkata = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(now);

    expect(
      formatTransportDate(todayKolkata, {
        timeZone: "Asia/Kolkata",
        relative: true,
      }),
    ).toBe("Today");

    // Yesterday's date
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayKolkata = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(yesterday);

    expect(
      formatTransportDate(yesterdayKolkata, {
        timeZone: "Asia/Kolkata",
        relative: true,
      }),
    ).toBe("Yesterday");

    // Older date should format as regular date string
    const olderFormatted = formatTransportDate("2025-01-15", {
      timeZone: "Asia/Kolkata",
      relative: true,
    });
    expect(olderFormatted).toContain("Jan 15, 2025");
  });

  it("handles null and invalid inputs gracefully", () => {
    expect(formatTransportDate(null)).toBeNull();
    expect(formatTransportDate(undefined)).toBeNull();
    expect(formatTransportDate("")).toBeNull();
    expect(formatTransportDate("invalid")).toBeNull();
  });
});

describe("formatTransportDateTime", () => {
  it("formats both date and time in institute timezone", () => {
    const iso = "2026-11-09T02:30:00.000Z";
    const formatted = formatTransportDateTime(iso, { timeZone: "Asia/Kolkata", locale: "en-US" });
    expect(formatted).toContain("Nov 9, 2026");
    expect(formatted).toMatch(/8:30|8:00/); // 02:30 UTC + 5:30 = 8:00 AM
  });

  it("returns null for invalid timestamps", () => {
    expect(formatTransportDateTime(null)).toBeNull();
    expect(formatTransportDateTime("bad-iso")).toBeNull();
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
