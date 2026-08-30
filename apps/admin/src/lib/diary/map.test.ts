import { describe, expect, it } from "vitest";
import { diaryDtoToListItem, diaryDtosToListItems } from "./map";
import type { DiaryDayDto } from "./types";
import type { TeacherListItem } from "@/lib/teachers/types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TEACHER = "22222222-2222-4222-8222-222222222222";

function dto(overrides: Partial<DiaryDayDto> = {}): DiaryDayDto {
  return {
    id: "diary-1",
    instituteId: INST,
    academicYearId: null,
    teacherId: TEACHER,
    diaryDate: "2026-06-01",
    scope: "subject",
    submittedAt: "2026-06-01T10:00:00Z",
    createdAt: "2026-06-01T09:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    rows: [
      {
        id: "row-b",
        sectionId: "sec-b",
        classLabel: "10-B",
        description: "Second",
        sortOrder: 1,
        createdAt: "2026-06-01T09:00:00Z",
        updatedAt: "2026-06-01T09:00:00Z",
      },
      {
        id: "row-a",
        sectionId: "sec-a",
        classLabel: "10-A",
        description: "First",
        sortOrder: 0,
        createdAt: "2026-06-01T09:00:00Z",
        updatedAt: "2026-06-01T09:00:00Z",
      },
    ],
    ...overrides,
  };
}

describe("diary DTO mapping", () => {
  it("maps DiaryDayDto to list item", () => {
    const item = diaryDtoToListItem(dto());
    expect(item).toMatchObject({
      id: "diary-1",
      instituteId: INST,
      teacherId: TEACHER,
      academicYearId: null,
      date: "2026-06-01",
      submittedAt: "2026-06-01T10:00:00Z",
      scope: "subject",
    });
    expect(item.teacherName).toMatch(/^Teacher 22222222/);
  });

  it("joins teacher display name when provided", () => {
    const teachers = new Map<string, TeacherListItem>([
      [
        TEACHER,
        {
          id: TEACHER,
          name: "Ada Lovelace",
        } as TeacherListItem,
      ],
    ]);
    expect(diaryDtoToListItem(dto(), teachers).teacherName).toBe("Ada Lovelace");
  });

  it("maps nested rows with sectionId, classLabel and description", () => {
    const item = diaryDtoToListItem(dto());
    expect(item.rows).toEqual([
      { sectionId: "sec-a", className: "10-A", description: "First" },
      { sectionId: "sec-b", className: "10-B", description: "Second" },
    ]);
  });

  it("maps activity scope explicitly", () => {
    expect(diaryDtoToListItem(dto({ scope: "activity" })).scope).toBe(
      "activity",
    );
  });

  it("falls back when teacherId is absent", () => {
    const item = diaryDtoToListItem(dto({ teacherId: "" }));
    expect(item.teacherName).toBe("Teacher");
  });

  it("handles invalid or missing submittedAt safely", () => {
    const item = diaryDtoToListItem(
      dto({ submittedAt: null, diaryDate: "not-a-date" }),
    );
    expect(item.submittedAt).toBe("");
    expect(item.date).toBe("not-a-date");
  });

  it("handles empty rows", () => {
    expect(diaryDtoToListItem(dto({ rows: [] })).rows).toEqual([]);
  });

  it("sorts rows by sortOrder", () => {
    const items = diaryDtosToListItems([dto()]);
    expect(items[0]?.rows.map((r) => r.className)).toEqual(["10-A", "10-B"]);
  });
});
