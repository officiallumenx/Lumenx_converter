import { describe, expect, it } from "vitest";
import {
  collectBirthdaysToday,
  extractMonthDay,
  isBirthdayOnDate,
  localYmd,
  turningAgeOnDate,
} from "./birthdays";

describe("localYmd", () => {
  it("formats local calendar date as YYYY-MM-DD", () => {
    expect(localYmd(new Date(2026, 9, 2))).toBe("2026-10-02");
  });
});

describe("extractMonthDay", () => {
  it("reads month and day from YYYY-MM-DD ignoring year", () => {
    expect(extractMonthDay("1990-10-02")).toEqual({ month: 10, day: 2 });
    expect(extractMonthDay("2010-10-02")).toEqual({ month: 10, day: 2 });
  });

  it("reads DMY as day/month (India)", () => {
    expect(extractMonthDay("02/10/1990")).toEqual({ month: 10, day: 2 });
    expect(extractMonthDay("2-10-1988")).toEqual({ month: 10, day: 2 });
  });
});

describe("isBirthdayOnDate", () => {
  const today = new Date(2026, 9, 2); // Oct 2, 2026

  it("matches month-day ignoring year", () => {
    expect(isBirthdayOnDate("2010-10-02", today)).toBe(true);
    expect(isBirthdayOnDate("1999-10-02T00:00:00.000Z", today)).toBe(true);
    expect(isBirthdayOnDate("1985-08-29", today)).toBe(false);
  });

  it("rejects null, other days, and invalid strings", () => {
    expect(isBirthdayOnDate(null, today)).toBe(false);
    expect(isBirthdayOnDate("2010-10-01", today)).toBe(false);
    expect(isBirthdayOnDate("not-a-date", today)).toBe(false);
  });

  it("matches common DMY forms for Oct 2", () => {
    expect(isBirthdayOnDate("02/10/2010", today)).toBe(true);
    expect(isBirthdayOnDate("02-10-2010", today)).toBe(true);
  });

  it("treats ISO midnight shifted into local day correctly", () => {
    // 1990-10-02 00:00 IST stored as UTC instant
    expect(isBirthdayOnDate("1990-10-01T18:30:00.000Z", today)).toBe(true);
  });
});

describe("turningAgeOnDate", () => {
  it("returns age they turn on that birthday", () => {
    expect(turningAgeOnDate("2010-10-02", new Date(2026, 9, 2))).toBe(16);
  });
});

describe("collectBirthdaysToday", () => {
  it("collects students and teachers with DOB today only (month+day)", () => {
    const onDate = new Date(2026, 9, 2);
    const rows = collectBirthdaysToday({
      onDate,
      students: [
        {
          id: "s1",
          displayName: "Ada",
          dateOfBirth: "2012-10-02",
          classLabel: "5",
          sectionLabel: "A",
          photoAssetPath: "photos/s1.jpg",
        },
        {
          id: "s2",
          displayName: "Bob",
          dateOfBirth: "2012-01-01",
          classLabel: "5",
          sectionLabel: "B",
        },
      ],
      teachers: [
        {
          id: "t1",
          displayName: "Ms. Chen",
          dateOfBirth: "1985-10-02",
          department: "Math",
          photoAssetPath: null,
        },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.name)).toEqual(["Ada", "Ms. Chen"]);
    expect(rows[0]?.role).toBe("Student");
    expect(rows[0]?.detail).toBe("5 · A");
    expect(rows[0]?.photoAssetPath).toBe("photos/s1.jpg");
    expect(rows[1]?.role).toBe("Teacher");
    expect(rows[1]?.photoAssetPath).toBeNull();
  });

  it("accepts teacher list shape with name/dept aliases", () => {
    const onDate = new Date(2026, 9, 2);
    const rows = collectBirthdaysToday({
      onDate,
      students: [],
      teachers: [
        {
          id: "t1",
          name: "Ms. Rao",
          dateOfBirth: "1988-10-02",
          dept: "Science",
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Ms. Rao");
    expect(rows[0]?.role).toBe("Teacher");
    expect(rows[0]?.detail).toBe("Science");
  });

  it("accepts snake_case date_of_birth from API wire shape", () => {
    const onDate = new Date(2026, 9, 2);
    const rows = collectBirthdaysToday({
      onDate,
      students: [],
      teachers: [
        {
          id: "t2",
          display_name: "Mr. Ali",
          date_of_birth: "1991-10-02",
          department: "English",
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Mr. Ali");
  });
});
