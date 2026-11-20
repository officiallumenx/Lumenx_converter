import { describe, expect, it } from "vitest";
import { transportServiceDateToday } from "./service-date";

describe("transportServiceDateToday", () => {
  it("uses Asia/Kolkata so UTC evening stays on the IST calendar day", () => {
    // 2026-10-14 20:30 UTC = 2026-10-15 02:00 IST
    const utcEvening = new Date("2026-10-14T20:30:00.000Z");
    expect(utcEvening.toISOString().slice(0, 10)).toBe("2026-10-14");
    expect(transportServiceDateToday("Asia/Kolkata", utcEvening)).toBe(
      "2026-10-15",
    );
  });

  it("stays on the previous IST day just before Kolkata midnight", () => {
    // 2026-10-14 18:29 UTC = 2026-10-14 23:59 IST
    const beforeIstMidnight = new Date("2026-10-14T18:29:00.000Z");
    expect(transportServiceDateToday("Asia/Kolkata", beforeIstMidnight)).toBe(
      "2026-10-14",
    );
  });

  it("defaults empty timezone to Asia/Kolkata", () => {
    const midMorningIst = new Date("2026-10-15T04:00:00.000Z"); // 09:30 IST
    expect(transportServiceDateToday("  ", midMorningIst)).toBe("2026-10-15");
  });
});
