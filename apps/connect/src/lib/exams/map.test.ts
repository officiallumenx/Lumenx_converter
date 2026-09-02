import { describe, expect, it } from "vitest";
import { examDtosToTeacherExamPapers, pickUpcomingExamPapers } from "./map";
import type { ExamDto } from "./types";

const baseExam = (patch: Partial<ExamDto> = {}): ExamDto => ({
  id: "ex111111-1111-4111-8111-111111111111",
  instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  academicYearId: "yyyyyyyy-yyyy-4yyy-8yyy-yyyyyyyyyyyy",
  name: "Mid Term",
  header: "Mid Term Examination",
  startDate: "2026-10-01",
  endDate: "2026-10-05",
  defaultStartsAt: "09:00:00",
  defaultEndsAt: "12:00:00",
  totalMarks: 100,
  internalMarks: null,
  externalMarks: null,
  audienceScope: "year",
  scheduleStatus: "published",
  lifecycleStatus: "open",
  schedulePublishedAt: "2026-09-01T00:00:00Z",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  targetSections: [],
  subjectSchedules: [
    {
      id: "sc111111-1111-4111-8111-111111111111",
      subjectId: "subj1111-1111-4111-8111-111111111111",
      paperDate: "2026-10-02",
      startsAt: "09:00:00",
      endsAt: "12:00:00",
      room: "Hall A",
      invigilatorTeacherId: "teach111-1111-4111-8111-111111111111",
    },
  ],
  ...patch,
});

describe("connect exams map", () => {
  it("maps published exams to teacher paper rows with invigilation flag", () => {
    const papers = examDtosToTeacherExamPapers({
      exams: [baseExam()],
      subjectLabels: new Map([["subj1111-1111-4111-8111-111111111111", "Mathematics"]]),
      teacherId: "teach111-1111-4111-8111-111111111111",
      classLabels: new Map(),
      defaultClassId: "sec111111-1111-4111-8111-111111111111",
    });
    expect(papers).toHaveLength(1);
    expect(papers[0]?.subject).toBe("Mathematics");
    expect(papers[0]?.isInvigilator).toBe(true);
    expect(papers[0]?.room).toBe("Hall A");
  });

  it("picks upcoming papers only", () => {
    const papers = examDtosToTeacherExamPapers({
      exams: [
        baseExam({
          subjectSchedules: [
            {
              id: "a",
              subjectId: "subj1111-1111-4111-8111-111111111111",
              paperDate: "2020-01-01",
              startsAt: "09:00:00",
              endsAt: "12:00:00",
              room: null,
              invigilatorTeacherId: null,
            },
            {
              id: "b",
              subjectId: "subj1111-1111-4111-8111-111111111111",
              paperDate: "2099-01-01",
              startsAt: "09:00:00",
              endsAt: "12:00:00",
              room: null,
              invigilatorTeacherId: null,
            },
          ],
        }),
      ],
      subjectLabels: new Map(),
      teacherId: null,
      classLabels: new Map(),
      defaultClassId: "",
    });
    expect(pickUpcomingExamPapers(papers, 5)).toHaveLength(1);
    expect(pickUpcomingExamPapers(papers, 5)[0]?.date).toBe("2099-01-01");
  });
});
