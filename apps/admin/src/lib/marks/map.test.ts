import { describe, expect, it } from "vitest";
import { markEntryDtoToListItem, markEntryDtosToListItems } from "./map";
import type { MarkEntryDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<MarkEntryDto> = {}): MarkEntryDto {
  return {
    id: "mm111111-1111-4111-8111-111111111111",
    instituteId: INST,
    academicYearId: "yyyyyyyy-yyyy-4yyy-8yyy-yyyyyyyyyyyy",
    classId: "cc111111-1111-4111-8111-111111111111",
    sectionId: "ss111111-1111-4111-8111-111111111111",
    examId: "ee111111-1111-4111-8111-111111111111",
    subjectId: "subj-math-1111-4111-8111-111111111111",
    teacherId: "tt111111-1111-4111-8111-111111111111",
    maxMarks: 100,
    status: "submitted",
    submittedAt: "2026-06-01T10:00:00Z",
    publishedAt: null,
    adminNote: null,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("marks DTO mapping", () => {
  it("maps core entry fields with placeholder labels", () => {
    const item = markEntryDtoToListItem(dto());
    expect(item.id).toBe("mm111111-1111-4111-8111-111111111111");
    expect(item.teacherName).toContain("Teacher ·");
    expect(item.subject).toContain("Subject ·");
    expect(item.classGrade).toContain("Class ·");
    expect(item.section).toContain("Sec ·");
    expect(item.examName).toContain("Exam ·");
    expect(item.status).toBe("submitted");
    expect(item.maxMarks).toBe(100);
    expect(item.students).toEqual([]);
  });

  it("maps embedded scores when present", () => {
    const item = markEntryDtoToListItem(
      dto({
        scores: [
          {
            id: "sc-1",
            enrollmentId: "en-1",
            studentId: "st111111-1111-4111-8111-111111111111",
            marks: 88,
            createdAt: "",
            updatedAt: "",
          },
        ],
      }),
    );
    expect(item.students).toHaveLength(1);
    expect(item.students[0]?.marks).toBe(88);
  });

  it("maps multiple DTOs and rejects malformed payload", () => {
    const items = markEntryDtosToListItems([dto(), dto({ id: "mm-2" })]);
    expect(items).toHaveLength(2);
    expect(() => markEntryDtosToListItems({ not: "array" } as never)).toThrow(
      /array/i,
    );
  });
});
