import { describe, expect, it } from "vitest";
import {
  learnerSchedulesToStudentExams,
  reportCardsToPerformance,
  reportCardsToTrend,
} from "./map";

describe("connect dashboard map", () => {
  it("derives performance and trend from published report cards", () => {
    const cards = [
      {
        id: "rc1",
        term: "Term 1",
        publishedOn: "2026-04-01",
        marks: [
          { subject: "Math", internal: 0, exam: 70, total: 70, grade: "B" },
        ],
        percentage: 70,
        grade: "B",
        rank: 0,
        status: "published" as const,
      },
      {
        id: "rc2",
        term: "Term 2",
        publishedOn: "2026-08-01",
        marks: [
          { subject: "Math", internal: 0, exam: 80, total: 80, grade: "A" },
        ],
        percentage: 80,
        grade: "A",
        rank: 0,
        status: "published" as const,
      },
    ];

    expect(reportCardsToTrend(cards)).toEqual([
      { term: "Term 1", score: 70 },
      { term: "Term 2", score: 80 },
    ]);
    expect(reportCardsToPerformance(cards)).toEqual([
      { subject: "Math", score: 80, prev: 80 },
    ]);
  });

  it("maps upcoming learner exam schedules to student dashboard rows", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const iso = tomorrow.toISOString().slice(0, 10);
    const rows = learnerSchedulesToStudentExams([
      {
        examId: "exam-1",
        examName: "Mid Term",
        header: "Mid Term",
        term: "Mid Term",
        classScope: "all",
        grades: [],
        startDate: iso,
        endDate: iso,
        startTime: "09:00",
        endTime: "12:00",
        timetableStatus: "published",
        slots: [
          {
            date: iso,
            dayNumber: 1,
            subject: "Math",
            startTime: "09:00",
            endTime: "12:00",
            room: "Hall A",
          },
        ],
        updatedAt: iso,
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.subject).toBe("Math");
    expect(rows[0]?.room).toBe("Hall A");
  });
});
