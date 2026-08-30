import { describe, expect, it } from "vitest";
import {
  classLabelForSection,
  sectionDtoToDetailItem,
  sectionDtoToListItem,
  sectionsToListItems,
} from "./map";
import type { ClassDto, SectionDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLASS_ID = "cc111111-1111-4111-8111-111111111111";

function sectionDto(overrides: Partial<SectionDto> = {}): SectionDto {
  return {
    id: "ss111111-1111-4111-8111-111111111111",
    instituteId: INST,
    academicYearId: "yyyyyyyy-yyyy-4yyy-8yyy-yyyyyyyyyyyy",
    classId: CLASS_ID,
    name: "Section A",
    code: "A",
    capacity: 40,
    room: "Block A-101",
    sortOrder: 1,
    status: "active",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

function classDto(overrides: Partial<ClassDto> = {}): ClassDto {
  return {
    id: CLASS_ID,
    instituteId: INST,
    academicYearId: "yyyyyyyy-yyyy-4yyy-8yyy-yyyyyyyyyyyy",
    name: "Grade 10",
    code: "G10",
    sortOrder: 1,
    status: "active",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("classes DTO mapping", () => {
  it("joins section with class label for card title", () => {
    const classesById = new Map([[CLASS_ID, classDto()]]);
    const item = sectionDtoToListItem(sectionDto(), classesById);
    expect(item.name).toBe("Grade 10 · Sec A");
    expect(item.section).toBe("A");
    expect(item.room).toBe("Block A-101");
    expect(item.capacity).toBe(40);
    expect(item.timetableGrade).toBe("G10");
    expect(item.levelId).toBe(CLASS_ID);
  });

  it("uses placeholders for fields not in list DTO", () => {
    const classesById = new Map([[CLASS_ID, classDto()]]);
    const item = sectionDtoToListItem(sectionDto(), classesById);
    expect(item.teacher).toBe("—");
    expect(item.students).toBe(0);
    expect(item.hasTimetable).toBe(false);
    expect(item.subjectTeacherAssignments).toEqual({});
  });

  it("falls back when class join is missing", () => {
    const item = sectionDtoToListItem(sectionDto(), new Map());
    expect(item.name).toBe("Class · Sec A");
    expect(classLabelForSection(sectionDto(), new Map())).toBe("Class");
  });

  it("handles sparse section fields", () => {
    const item = sectionDtoToListItem(
      sectionDto({ code: "  ", name: "  ", room: null, capacity: null }),
      new Map([[CLASS_ID, classDto({ name: "  ", code: "G11" })]]),
    );
    expect(item.section).toBe("—");
    expect(item.room).toBe("—");
    expect(item.capacity).toBe(0);
    expect(item.name).toBe("G11 · Sec —");
  });

  it("maps multiple sections and rejects malformed payload", () => {
    const items = sectionsToListItems(
      [sectionDto(), sectionDto({ id: "ss-2", code: "B" })],
      [classDto()],
    );
    expect(items).toHaveLength(2);
    expect(() =>
      sectionsToListItems({ not: "array" } as never, []),
    ).toThrow(/array/i);
    expect(() =>
      sectionsToListItems([], { not: "array" } as never),
    ).toThrow(/array/i);
  });

  it("detail mapping keeps instituteId and classId for tenant writes", () => {
    const detail = sectionDtoToDetailItem(sectionDto(), classDto());
    expect(detail.instituteId).toBe(INST);
    expect(detail.classId).toBe(CLASS_ID);
    expect(detail.classStatus).toBe("active");
    expect(detail.sectionStatus).toBe("active");
  });
});
