import { describe, expect, it } from "vitest";
import {
  classLabelForSection,
  sectionDtoToDetailItem,
  sectionDtoToListItem,
  sectionsToListItems,
} from "./map";
import { buildSectionEnrichment } from "./enrich";
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
    name: "Class 10",
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
    expect(item.name).toBe("Class 10 · Sec A");
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

  it("applies enrollment and teacher enrichment", () => {
    const section = sectionDto();
    const classesById = new Map([[CLASS_ID, classDto()]]);
    const enrich = buildSectionEnrichment(
      [
        {
          id: "e1",
          instituteId: INST,
          academicYearId: "y",
          studentId: "s1",
          studentName: "A",
          classId: CLASS_ID,
          sectionId: section.id,
          rollNo: "1",
          status: "active",
          enrolledOn: "2026-01-01",
          withdrawnOn: null,
          createdAt: "",
          updatedAt: "",
        },
      ],
      [
        {
          id: "a1",
          instituteId: INST,
          academicYearId: "y",
          classId: CLASS_ID,
          sectionId: section.id,
          subjectId: "su1",
          teacherId: "tt1",
          status: "active",
        },
      ],
      new Map([["tt1", { name: "Ms Rao" }]]),
      new Map([["su1", { name: "Math", code: "MATH" }]]),
    );
    const item = sectionDtoToListItem(section, classesById, enrich);
    expect(item.students).toBe(1);
    expect(item.teacher).toBe("Ms Rao");
    expect(item.hasTimetable).toBe(true);
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

  it("orders by class then section, not creation order", () => {
    const grade10 = classDto({
      id: "c10",
      name: "Class 10",
      code: "10",
      sortOrder: 0,
    });
    const grade8 = classDto({
      id: "c8",
      name: "Class 8",
      code: "8",
      sortOrder: 0,
    });
    const grade9 = classDto({
      id: "c9",
      name: "Class 9",
      code: "9",
      sortOrder: 0,
    });
    const items = sectionsToListItems(
      [
        sectionDto({ id: "s10a", classId: grade10.id, code: "A", sortOrder: 0 }),
        sectionDto({ id: "s9b", classId: grade9.id, code: "B", sortOrder: 0 }),
        sectionDto({ id: "s8a", classId: grade8.id, code: "A", sortOrder: 0 }),
        sectionDto({ id: "s9a", classId: grade9.id, code: "A", sortOrder: 0 }),
      ],
      [grade10, grade8, grade9],
    );
    expect(items.map((item) => item.name)).toEqual([
      "Class 8 · Sec A",
      "Class 9 · Sec A",
      "Class 9 · Sec B",
      "Class 10 · Sec A",
    ]);
  });

  it("orders Class 2 before Class 10 when sortOrder is missing", () => {
    const c10 = classDto({ id: "c10", name: "Class 10", code: "CLASS-10", sortOrder: 0 });
    const c2 = classDto({ id: "c2", name: "Class 2", code: "CLASS-2", sortOrder: 0 });
    const items = sectionsToListItems(
      [
        sectionDto({ id: "s10", classId: c10.id, code: "A" }),
        sectionDto({ id: "s2", classId: c2.id, code: "A" }),
      ],
      [c10, c2],
    );
    expect(items.map((item) => item.name)).toEqual([
      "Class 2 · Sec A",
      "Class 10 · Sec A",
    ]);
  });

  it("orders Sec A before Sec B even when B was created first", () => {
    const cls = classDto({ id: "c8", name: "Class 8", code: "CLASS-8", sortOrder: 0 });
    const items = sectionsToListItems(
      [
        sectionDto({ id: "s8b", classId: cls.id, code: "B", name: "B", sortOrder: 1 }),
        sectionDto({ id: "s8a", classId: cls.id, code: "A", name: "A", sortOrder: 2 }),
      ],
      [cls],
    );
    expect(items.map((item) => item.name)).toEqual([
      "Class 8 · Sec A",
      "Class 8 · Sec B",
    ]);
  });

  it("interleaves Sec A/B across duplicate Class 8 codes", () => {
    const c8a = classDto({ id: "c8a", name: "Grade 8", code: "G8", sortOrder: 0 });
    const c8b = classDto({ id: "c8b", name: "Class 8", code: "8", sortOrder: 0 });
    const items = sectionsToListItems(
      [
        sectionDto({ id: "s-b", classId: c8a.id, code: "B", sortOrder: 0 }),
        sectionDto({ id: "s-a", classId: c8b.id, code: "A", sortOrder: 0 }),
      ],
      [c8a, c8b],
    );
    expect(items.map((item) => item.name)).toEqual([
      "Class 8 · Sec A",
      "Class 8 · Sec B",
    ]);
  });

  it("detail mapping keeps instituteId and classId for tenant writes", () => {
    const detail = sectionDtoToDetailItem(sectionDto(), classDto());
    expect(detail.instituteId).toBe(INST);
    expect(detail.classId).toBe(CLASS_ID);
    expect(detail.classStatus).toBe("active");
    expect(detail.sectionStatus).toBe("active");
    expect(detail.classTeacherId).toBe(sectionDto().classTeacherId ?? null);
  });
});
