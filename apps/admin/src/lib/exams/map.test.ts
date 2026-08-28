import { describe, expect, it } from "vitest";
import {
  examDtoToListItem,
  examDtoToTimetableListItem,
  examDtosToCatalog,
} from "./map";
import type { ExamDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<ExamDto> = {}): ExamDto {
  return {
    id: "ee111111-1111-4111-8111-111111111111",
    instituteId: INST,
    academicYearId: "yyyyyyyy-yyyy-4yyy-8yyy-yyyyyyyyyyyy",
    name: "Mid-Term Examination",
    header: "Mid-Term 2026",
    startDate: "2026-09-01",
    endDate: "2026-09-15",
    defaultStartsAt: "09:00:00",
    defaultEndsAt: "12:00:00",
    totalMarks: 100,
    internalMarks: null,
    externalMarks: null,
    audienceScope: "year",
    scheduleStatus: "draft",
    lifecycleStatus: "open",
    schedulePublishedAt: null,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    targetSections: [],
    subjectSchedules: [],
    ...overrides,
  };
}

describe("exams DTO mapping", () => {
  it("maps core exam fields for pipeline list", () => {
    const item = examDtoToListItem(dto(), "2026-08-01");
    expect(item.name).toBe("Mid-Term Examination");
    expect(item.startDate).toBe("2026-09-01");
    expect(item.endDate).toBe("2026-09-15");
    expect(item.startTime).toBe("09:00");
    expect(item.endTime).toBe("12:00");
    expect(item.status).toBe("scheduled");
    expect(item.grade).toBe("All classes");
    expect(item.classScope).toBe("all");
  });

  it("maps section audience to selected scope label", () => {
    const item = examDtoToListItem(
      dto({
        audienceScope: "section",
        targetSections: [
          {
            id: "t1",
            classId: "c1",
            sectionId: "s1",
            createdAt: "",
            updatedAt: "",
          },
          {
            id: "t2",
            classId: "c1",
            sectionId: "s2",
            createdAt: "",
            updatedAt: "",
          },
        ],
      }),
      "2026-08-01",
    );
    expect(item.classScope).toBe("selected");
    expect(item.grade).toBe("2 sections");
  });

  it("derives timetable cards from subject schedules", () => {
    const timetable = examDtoToTimetableListItem(
      dto({
        scheduleStatus: "published",
        subjectSchedules: [
          {
            id: "sch-1",
            subjectId: "subj-math",
            paperDate: "2026-09-01",
            startsAt: "09:00:00",
            endsAt: "12:00:00",
            room: "Hall A",
            invigilatorTeacherId: null,
            createdAt: "",
            updatedAt: "",
          },
        ],
      }),
    );
    expect(timetable.examId).toBe("ee111111-1111-4111-8111-111111111111");
    expect(timetable.status).toBe("published");
    expect(timetable.slots).toHaveLength(1);
    expect(timetable.slots[0]?.startTime).toBe("09:00");
  });

  it("builds catalog and rejects malformed payload", () => {
    const catalog = examDtosToCatalog([dto()], "2026-08-01");
    expect(catalog.items).toHaveLength(1);
    expect(catalog.timetables).toHaveLength(0);
    expect(() => examDtosToCatalog({ not: "array" } as never)).toThrow(/array/i);
  });
});
