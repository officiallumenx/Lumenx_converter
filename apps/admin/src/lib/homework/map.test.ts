import { describe, expect, it } from "vitest";
import { homeworkDtoToListItem } from "./map";
import type { HomeworkDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("homework map", () => {
  it("maps dto to list item with joined labels", () => {
    const dto: HomeworkDto = {
      id: "hh111111-1111-4111-8111-111111111111",
      instituteId: INST,
      academicYearId: "aa111111-1111-4111-8111-111111111111",
      classId: "cc111111-1111-4111-8111-111111111111",
      sectionId: "ss111111-1111-4111-8111-111111111111",
      subjectId: "su111111-1111-4111-8111-111111111111",
      teacherId: "tt111111-1111-4111-8111-111111111111",
      kind: "homework",
      title: "Chapter 5 exercises",
      description: "Complete all questions",
      instructions: null,
      dueDate: "2026-06-10",
      status: "published",
      publishedAt: "2026-06-01T10:00:00Z",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    };
    const row = homeworkDtoToListItem(
      dto,
      new Map([[dto.teacherId, { id: dto.teacherId, name: "Mr. Rao" } as never]]),
      new Map([
        [
          dto.sectionId,
          {
            id: dto.sectionId,
            classId: dto.classId,
            code: "A",
            name: "A",
            sortOrder: 0,
          } as never,
        ],
      ]),
      new Map([[dto.classId, { id: dto.classId, name: "Class 10", code: "10" } as never]]),
      new Map([[dto.subjectId, { id: dto.subjectId, name: "Math" } as never]]),
    );
    expect(row.teacherName).toBe("Mr. Rao");
    expect(row.classLabel).toContain("Class 10");
    expect(row.subjectLabel).toBe("Math");
    expect(row.status).toBe("published");
    expect(row.description).toBe("Complete all questions");
    expect(row.instituteId).toBe(INST);
  });
});
