import { describe, expect, it } from "vitest";
import {
  computeOperationalScore,
  formatPerformanceTrend,
} from "../src/domains/teacher-performance/score.js";
import {
  aggregateMonthlyInstituteAverages,
  aggregateTeacherWindows,
  buildPerformanceDateRanges,
} from "../src/domains/teacher-performance/repository.js";

describe("teacher-performance score", () => {
  it("returns null when no operational signals exist", () => {
    expect(
      computeOperationalScore({
        staffPresent: 0,
        staffTotal: 0,
        publishedMarks: 0,
        publishedHomework: 0,
        submittedDiaryDays: 0,
        submittedAttendanceRegisters: 0,
      }),
    ).toBeNull();
  });

  it("computes OPI from staff attendance and published work", () => {
    const rating = computeOperationalScore({
      staffPresent: 18,
      staffTotal: 20,
      publishedMarks: 5,
      publishedHomework: 8,
      submittedDiaryDays: 12,
      submittedAttendanceRegisters: 15,
    });
    expect(rating).not.toBeNull();
    expect(rating!).toBeGreaterThan(3);
    expect(rating!).toBeLessThanOrEqual(5);
  });

  it("formats trend deltas with sign", () => {
    expect(formatPerformanceTrend(4.5, 4.2)).toBe("+0.30");
    expect(formatPerformanceTrend(4.1, 4.3)).toBe("-0.20");
    expect(formatPerformanceTrend(4, 4)).toBe("0.00");
    expect(formatPerformanceTrend(null, 4)).toBe("0.00");
  });
});

describe("teacher-performance aggregation", () => {
  const asOf = new Date("2026-08-31T12:00:00.000Z");
  const ranges = buildPerformanceDateRanges(asOf);
  const teacherId = "t0111111-1111-4111-8111-111111111111";

  it("aggregates institute signals into teacher windows", () => {
    const facts = {
      staff: [
        {
          teacher_id: teacherId,
          attendance_date: "2026-08-20",
          status: "present",
        },
        {
          teacher_id: teacherId,
          attendance_date: "2026-07-15",
          status: "absent",
        },
      ],
      marks: [
        {
          teacher_id: teacherId,
          published_at: "2026-08-10T00:00:00.000Z",
          updated_at: "2026-08-10T00:00:00.000Z",
        },
      ],
      homework: [],
      diary: [
        {
          teacher_id: teacherId,
          diary_date: "2026-08-05",
          submitted_at: "2026-08-05T10:00:00.000Z",
        },
      ],
      registers: [
        {
          marked_by_teacher_id: teacherId,
          attendance_date: "2026-08-12",
          status: "submitted",
        },
      ],
    };

    const windows = aggregateTeacherWindows(facts, [teacherId], ranges);
    const counts = windows.get(teacherId)!;

    expect(counts.ratingWindow.staffTotal).toBe(2);
    expect(counts.ratingWindow.staffPresent).toBe(1);
    expect(counts.ratingWindow.publishedMarks).toBe(1);
    expect(counts.ratingWindow.submittedDiaryDays).toBe(1);
    expect(counts.ratingWindow.submittedAttendanceRegisters).toBe(1);
    expect(computeOperationalScore(counts.ratingWindow)).not.toBeNull();
  });

  it("builds monthly institute averages from shared facts", () => {
    const facts = {
      staff: [
        {
          teacher_id: teacherId,
          attendance_date: "2026-08-20",
          status: "present",
        },
      ],
      marks: [],
      homework: [],
      diary: [],
      registers: [],
    };

    const trend = aggregateMonthlyInstituteAverages(
      facts,
      [teacherId],
      3,
      asOf,
    );
    expect(trend.length).toBeGreaterThan(0);
    expect(trend[trend.length - 1]?.value).toBeGreaterThan(0);
  });
});
