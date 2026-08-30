import { describe, expect, it } from "vitest";
import {
  aggregateAttendanceByClass,
  aggregateAttendanceMonthly,
  aggregateEnrollmentMonthly,
  aggregateFeePaymentsMonthly,
  aggregateStudentStatus,
  aggregateSubjectAverages,
  monthsForRange,
  seriesHasAttendanceSignal,
  seriesHasEnrollmentSignal,
  seriesHasFeeSignal,
  ymdInInclusiveRange,
} from "./aggregate.js";

describe("monthsForRange", () => {
  it("returns 4 months for term ending Aug 2026", () => {
    const months = monthsForRange("term", new Date(2026, 7, 29));
    expect(months.map((m) => m.month)).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
    ]);
  });

  it("returns 12 months for year", () => {
    const months = monthsForRange("year", new Date(2026, 7, 29));
    expect(months).toHaveLength(12);
    expect(months[0]?.month).toBe("2025-09");
    expect(months[11]?.month).toBe("2026-08");
  });
});

describe("ymdInInclusiveRange", () => {
  it("includes endpoints and rejects outside / invalid", () => {
    expect(ymdInInclusiveRange("2026-05-01", "2026-05-01", "2026-08-31")).toBe(true);
    expect(ymdInInclusiveRange("2026-08-31T12:00:00.000Z", "2026-05-01", "2026-08-31")).toBe(
      true,
    );
    expect(ymdInInclusiveRange("2026-04-30", "2026-05-01", "2026-08-31")).toBe(false);
    expect(ymdInInclusiveRange("not-a-date", "2026-05-01", "2026-08-31")).toBe(false);
  });
});

describe("aggregateStudentStatus", () => {
  it("counts real status enum values only", () => {
    const rows = aggregateStudentStatus([
      { status: "active" },
      { status: "active" },
      { status: "at-risk" },
      { status: "watch" },
    ]);
    expect(rows).toEqual([
      { status: "active", label: "Active", count: 2 },
      { status: "at-risk", label: "At risk", count: 1 },
      { status: "watch", label: "Watch", count: 1 },
    ]);
  });
});

describe("aggregateEnrollmentMonthly", () => {
  it("counts new enrollments and cumulative students by createdAt", () => {
    const months = monthsForRange("term", new Date(2026, 7, 1));
    const rows = aggregateEnrollmentMonthly(months, {
      enrollments: [
        { enrolledOn: "2026-07-15" },
        { enrolledOn: "2026-07-20" },
        { enrolledOn: "2026-08-01" },
      ],
      students: [
        { createdAt: "2026-06-10T00:00:00.000Z" },
        { createdAt: "2026-08-05T00:00:00.000Z" },
      ],
    });
    const jul = rows.find((r) => r.month === "2026-07");
    const aug = rows.find((r) => r.month === "2026-08");
    expect(jul?.newEnrollments).toBe(2);
    expect(aug?.newEnrollments).toBe(1);
    expect(jul?.totalStudents).toBe(1);
    expect(aug?.totalStudents).toBe(2);
    expect(seriesHasEnrollmentSignal(rows)).toBe(true);
  });

  it("does not invent enrollment history when facts are empty", () => {
    const months = monthsForRange("term", new Date(2026, 7, 1));
    const rows = aggregateEnrollmentMonthly(months, {
      enrollments: [],
      students: [],
    });
    expect(rows.every((r) => r.newEnrollments === 0 && r.totalStudents === 0)).toBe(true);
    expect(seriesHasEnrollmentSignal(rows)).toBe(false);
  });
});

describe("aggregateAttendanceMonthly / byClass", () => {
  it("computes present % without inventing months of data", () => {
    const months = monthsForRange("term", new Date(2026, 7, 1));
    const facts = [
      { attendanceDate: "2026-08-01", classId: "c1", status: "present" as const },
      { attendanceDate: "2026-08-01", classId: "c1", status: "absent" as const },
      { attendanceDate: "2026-08-02", classId: "c2", status: "present" as const },
    ];
    const monthly = aggregateAttendanceMonthly(months, facts);
    const aug = monthly.find((r) => r.month === "2026-08");
    expect(aug?.markCount).toBe(3);
    expect(aug?.presentPct).toBe(66.7);
    expect(monthly.find((r) => r.month === "2026-05")?.presentPct).toBeNull();
    expect(seriesHasAttendanceSignal(monthly)).toBe(true);

    const byClass = aggregateAttendanceByClass(
      facts,
      new Map([
        ["c1", "Grade 5"],
        ["c2", "Grade 6"],
      ]),
    );
    expect(byClass).toHaveLength(2);
    expect(byClass.find((r) => r.classId === "c1")?.presentPct).toBe(50);
  });

  it("isolates class buckets — foreign class facts must not bleed", () => {
    const onlyA = [
      { attendanceDate: "2026-08-01", classId: "class-a", status: "present" as const },
      { attendanceDate: "2026-08-01", classId: "class-a", status: "present" as const },
    ];
    const mixed = [
      ...onlyA,
      { attendanceDate: "2026-08-01", classId: "class-b", status: "absent" as const },
    ];
    const aOnly = aggregateAttendanceByClass(onlyA, new Map([["class-a", "A"]]));
    const mixedRows = aggregateAttendanceByClass(
      mixed,
      new Map([
        ["class-a", "A"],
        ["class-b", "B"],
      ]),
    );
    expect(aOnly).toHaveLength(1);
    expect(aOnly[0]?.presentPct).toBe(100);
    expect(mixedRows.find((r) => r.classId === "class-a")?.presentPct).toBe(100);
    expect(mixedRows.find((r) => r.classId === "class-b")?.presentPct).toBe(0);
  });
});

describe("aggregateFeePaymentsMonthly", () => {
  it("sums amounts by paid_on month", () => {
    const months = monthsForRange("term", new Date(2026, 7, 1));
    const rows = aggregateFeePaymentsMonthly(months, [
      { paidOn: "2026-08-10", amount: 100.5 },
      { paidOn: "2026-08-11", amount: 50 },
      { paidOn: "2026-06-01", amount: 200 },
    ]);
    expect(rows.find((r) => r.month === "2026-08")?.collected).toBe(150.5);
    expect(rows.find((r) => r.month === "2026-08")?.paymentCount).toBe(2);
    expect(seriesHasFeeSignal(rows)).toBe(true);
  });

  it("ignores payments outside the month buckets (caller pre-filters institute)", () => {
    const months = monthsForRange("term", new Date(2026, 7, 1));
    const rows = aggregateFeePaymentsMonthly(months, [
      { paidOn: "2025-01-01", amount: 9999 },
      { paidOn: "2026-08-01", amount: 10 },
    ]);
    expect(rows.find((r) => r.month === "2026-08")?.collected).toBe(10);
    expect(rows.every((r) => r.month !== "2025-01")).toBe(true);
  });
});

describe("aggregateSubjectAverages", () => {
  it("averages score/maxMarks % for published entries only (caller filters)", () => {
    const rows = aggregateSubjectAverages(
      [
        { id: "e1", subjectId: "s1", maxMarks: 100 },
        { id: "e2", subjectId: "s1", maxMarks: 50 },
      ],
      [
        { markEntryId: "e1", marks: 80 },
        { markEntryId: "e2", marks: 40 },
        { markEntryId: "e1", marks: null },
      ],
      new Map([["s1", "Math"]]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.subjectName).toBe("Math");
    expect(rows[0]?.scoreCount).toBe(2);
    expect(rows[0]?.avgPct).toBe(80);
  });

  it("does not invent averages when scores are empty", () => {
    expect(
      aggregateSubjectAverages(
        [{ id: "e1", subjectId: "s1", maxMarks: 100 }],
        [],
        new Map([["s1", "Math"]]),
      ),
    ).toEqual([]);
  });
});
