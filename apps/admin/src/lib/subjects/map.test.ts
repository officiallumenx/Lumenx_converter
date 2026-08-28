import { describe, expect, it } from "vitest";
import {
  applicableClassCodesToGrades,
  gradesDisplayLabel,
  subjectDtoToListItem,
  subjectDtosToListItems,
} from "./map";
import type { SubjectDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<SubjectDto> = {}): SubjectDto {
  return {
    id: "cc111111-1111-4111-8111-111111111111",
    instituteId: INST,
    name: "Mathematics",
    code: "MTH 101",
    category: "Sciences",
    periodsPerWeek: 5,
    applicableClassCodes: ["Grade 10", "G11"],
    status: "active",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("subjects DTO mapping", () => {
  it("maps core subject fields", () => {
    const item = subjectDtoToListItem(dto());
    expect(item.name).toBe("Mathematics");
    expect(item.code).toBe("MTH 101");
    expect(item.category).toBe("Sciences");
    expect(item.periodsPerWeek).toBe(5);
    expect(item.grades).toEqual(["Grade 10", "G11"]);
    expect(item.status).toBe("active");
    expect(item.assignedTeacherIds).toEqual([]);
  });

  it("falls back name when blank", () => {
    const item = subjectDtoToListItem(dto({ name: "   " }));
    expect(item.name).toBe("Subject");
  });

  it("handles sparse applicable class codes", () => {
    expect(applicableClassCodesToGrades(null)).toEqual([]);
    expect(applicableClassCodesToGrades(["  ", "G12"])).toEqual(["G12"]);
  });

  it("gradesDisplayLabel formats school vs college labels", () => {
    expect(gradesDisplayLabel(["Grade 10", "Grade 11"], false)).toBe("G10, G11");
    expect(gradesDisplayLabel(["Year 1"], true)).toBe("Year 1");
    expect(gradesDisplayLabel([], false)).toBe("—");
  });

  it("maps draft status and empty codes", () => {
    const item = subjectDtoToListItem(
      dto({ status: "draft", applicableClassCodes: [] }),
    );
    expect(item.status).toBe("draft");
    expect(item.grades).toEqual([]);
  });

  it("maps multiple DTOs and rejects malformed payload", () => {
    const items = subjectDtosToListItems([dto(), dto({ id: "s-2" })]);
    expect(items).toHaveLength(2);
    expect(() => subjectDtosToListItems({ not: "array" } as never)).toThrow(
      /array/i,
    );
  });
});
