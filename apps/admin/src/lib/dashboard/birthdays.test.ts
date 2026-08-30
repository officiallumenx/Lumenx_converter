import { describe, expect, it } from "vitest";
import {
  collectBirthdaysToday,
  isBirthdayOnDate,
  localYmd,
  turningAgeOnDate,
} from "./birthdays";

describe("localYmd", () => {
  it("formats local calendar date as YYYY-MM-DD", () => {
    expect(localYmd(new Date(2026, 7, 29))).toBe("2026-08-29");
  });
});

describe("isBirthdayOnDate", () => {
  const today = new Date(2026, 7, 29);

  it("matches month-day ignoring year", () => {
    expect(isBirthdayOnDate("2010-08-29", today)).toBe(true);
    expect(isBirthdayOnDate("1999-08-29T00:00:00.000Z", today)).toBe(true);
  });

  it("rejects null, other days, and invalid strings", () => {
    expect(isBirthdayOnDate(null, today)).toBe(false);
    expect(isBirthdayOnDate("2010-08-28", today)).toBe(false);
    expect(isBirthdayOnDate("not-a-date", today)).toBe(false);
  });
});

describe("turningAgeOnDate", () => {
  it("returns age they turn on that birthday", () => {
    expect(turningAgeOnDate("2010-08-29", new Date(2026, 7, 29))).toBe(16);
  });
});

describe("collectBirthdaysToday", () => {
  it("collects students and teachers with DOB today only", () => {
    const onDate = new Date(2026, 7, 29);
    const rows = collectBirthdaysToday({
      onDate,
      students: [
        {
          id: "s1",
          displayName: "Ada",
          dateOfBirth: "2012-08-29",
          classLabel: "5",
          sectionLabel: "A",
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
          dateOfBirth: "1985-08-29",
          department: "Math",
        },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.name)).toEqual(["Ada", "Ms. Chen"]);
    expect(rows[0]?.role).toBe("Student");
    expect(rows[0]?.detail).toBe("5 · A");
    expect(rows[1]?.role).toBe("Teacher");
  });
});
