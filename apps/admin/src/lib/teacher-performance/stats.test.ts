import { describe, expect, it } from "vitest";
import {
  computeDepartmentRankings,
  computeInstituteAverage,
  findTopRatedTeacher,
  instituteTrendDelta,
  trendTone,
} from "./stats";
import type { TeacherPerformanceDto, TeacherPerformanceSummary } from "./types";

const rows: TeacherPerformanceDto[] = [
  {
    teacherId: "1",
    name: "Alpha",
    department: "Math",
    rating: 4.8,
    trend: "+0.10",
    rank: 1,
    metrics: {
      staffAttendanceRate: 0.95,
      publishedMarks: 5,
      publishedHomework: 8,
      submittedDiaryDays: 10,
      submittedAttendanceRegisters: 12,
    },
    ratingSource: "operational",
  },
  {
    teacherId: "2",
    name: "Beta",
    department: "Math",
    rating: 4.2,
    trend: "-0.05",
    rank: 2,
    metrics: {
      staffAttendanceRate: 0.9,
      publishedMarks: 3,
      publishedHomework: 4,
      submittedDiaryDays: 6,
      submittedAttendanceRegisters: 8,
    },
    ratingSource: "operational",
  },
  {
    teacherId: "3",
    name: "Gamma",
    department: "Science",
    rating: null,
    trend: "0.00",
    rank: null,
    metrics: {
      staffAttendanceRate: null,
      publishedMarks: 0,
      publishedHomework: 0,
      submittedDiaryDays: 0,
      submittedAttendanceRegisters: 0,
    },
    ratingSource: "insufficient_data",
  },
];

describe("teacher-performance stats", () => {
  it("computes institute average from rated teachers", () => {
    expect(computeInstituteAverage(rows)).toBe("4.50");
  });

  it("prefers summary institute average when provided", () => {
    const summary: TeacherPerformanceSummary = {
      instituteAverage: 4.33,
      monthlyTrend: [],
      ratedCount: 2,
      facultyCount: 3,
    };
    expect(computeInstituteAverage(rows, summary)).toBe("4.33");
  });

  it("finds top rated teacher", () => {
    expect(findTopRatedTeacher(rows)?.name).toBe("Alpha");
  });

  it("builds department rankings", () => {
    const rankings = computeDepartmentRankings(rows);
    expect(rankings[0]?.department).toBe("Math");
    expect(rankings[0]?.average).toBe(4.5);
    expect(rankings[0]?.teacherCount).toBe(2);
  });

  it("classifies trend tone", () => {
    expect(trendTone("+0.12")).toBe("success");
    expect(trendTone("-0.08")).toBe("danger");
    expect(trendTone("0.00")).toBe("neutral");
  });

  it("derives institute trend delta from monthly points", () => {
    const summary: TeacherPerformanceSummary = {
      instituteAverage: 4.2,
      monthlyTrend: [
        { label: "Jun", value: 4.1 },
        { label: "Jul", value: 4.3 },
      ],
      ratedCount: 2,
      facultyCount: 2,
    };
    expect(instituteTrendDelta(summary)).toBe("+0.20");
  });
});
