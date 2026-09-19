import { describe, expect, it } from "vitest";
import {
  buildStudentClassOptions,
  buildStudentSectionOptions,
  resolveStudentCreatePlacement,
} from "./class-options";
import type { ClassDto, SectionDto } from "@/lib/classes/types";

const classes: ClassDto[] = [
  {
    id: "c8a",
    instituteId: "i",
    academicYearId: "y1",
    name: "Grade 8",
    code: "G8",
    sortOrder: 8,
    status: "active",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "c8b",
    instituteId: "i",
    academicYearId: "y1",
    name: "8",
    code: "8",
    sortOrder: 8,
    status: "active",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "c8-old",
    instituteId: "i",
    academicYearId: "y0",
    name: "Class 8",
    code: "CLASS-8",
    sortOrder: 8,
    status: "active",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "c9",
    instituteId: "i",
    academicYearId: "y1",
    name: "Class 9",
    code: "CLASS-9",
    sortOrder: 9,
    status: "active",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "c10",
    instituteId: "i",
    academicYearId: "y1",
    name: "Class 10",
    code: "CLASS-10",
    sortOrder: 10,
    status: "active",
    createdAt: "",
    updatedAt: "",
  },
];

const sections: SectionDto[] = [
  {
    id: "s9a",
    instituteId: "i",
    academicYearId: "y1",
    classId: "c9",
    name: "A",
    code: "A",
    capacity: 40,
    room: null,
    sortOrder: 1,
    status: "active",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "s9b",
    instituteId: "i",
    academicYearId: "y1",
    classId: "c9",
    name: "B",
    code: "B",
    capacity: 40,
    room: null,
    sortOrder: 2,
    status: "active",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "s8a",
    instituteId: "i",
    academicYearId: "y1",
    classId: "c8a",
    name: "A",
    code: "A",
    capacity: 40,
    room: null,
    sortOrder: 1,
    status: "active",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "s8b-dup",
    instituteId: "i",
    academicYearId: "y1",
    classId: "c8b",
    name: "B",
    code: "B",
    capacity: 40,
    room: null,
    sortOrder: 2,
    status: "active",
    createdAt: "",
    updatedAt: "",
  },
];

describe("buildStudentClassOptions", () => {
  it("dedupes Grade 8 / 8 / Class 8 into one Class 8 option", () => {
    const options = buildStudentClassOptions({
      classes,
      sections,
      activeAcademicYearId: "y1",
    });
    const eights = options.filter((item) => item.label === "Class 8");
    expect(eights).toHaveLength(1);
    expect(eights[0]?.sections.map((s) => s.label).sort()).toEqual(["A", "B"]);
    expect(options.map((item) => item.label)).toEqual([
      "Class 8",
      "Class 9",
      "Class 10",
    ]);
  });

  it("keeps classes even when they have no sections", () => {
    const options = buildStudentClassOptions({
      classes,
      sections,
      activeAcademicYearId: "y1",
    });
    expect(options.find((item) => item.label === "Class 10")?.sections).toEqual([]);
  });

  it("orders Class 2 before Class 10 even when sortOrder is zero", () => {
    const options = buildStudentClassOptions({
      classes: [
        {
          id: "c10",
          instituteId: "i",
          academicYearId: "y1",
          name: "Class 10",
          code: "CLASS-10",
          sortOrder: 0,
          status: "active",
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "c2",
          instituteId: "i",
          academicYearId: "y1",
          name: "Class 2",
          code: "CLASS-2",
          sortOrder: 0,
          status: "active",
          createdAt: "",
          updatedAt: "",
        },
      ],
      sections: [],
      activeAcademicYearId: "y1",
    });
    expect(options.map((item) => item.label)).toEqual(["Class 2", "Class 10"]);
  });

  it("attaches all active sections for a class", () => {
    const options = buildStudentClassOptions({
      classes,
      sections,
      activeAcademicYearId: "y1",
    });
    const grade9 = options.find((item) => item.label === "Class 9");
    expect(grade9?.sections.map((item) => item.label)).toEqual(["A", "B"]);
  });

  it("keeps each section's real classId after Grade/Class dedupe", () => {
    const options = buildStudentClassOptions({
      classes,
      sections,
      activeAcademicYearId: "y1",
    });
    const eight = options.find((item) => item.label === "Class 8");
    expect(eight).toBeTruthy();
    const secA = eight!.sections.find((s) => s.label === "A");
    const secB = eight!.sections.find((s) => s.label === "B");
    // A lives on c8a, B on c8b — both must keep their own classId for enrollment
    expect(secA?.classId).toBe("c8a");
    expect(secB?.classId).toBe("c8b");
    expect(secA?.sectionId).toBe("s8a");
    expect(secB?.sectionId).toBe("s8b-dup");
  });
});

describe("resolveStudentCreatePlacement", () => {
  it("enrolls using the section's classId, not the deduped option id", () => {
    const classOptions = buildStudentClassOptions({
      classes,
      sections,
      activeAcademicYearId: "y1",
    });
    const sectionOptions = buildStudentSectionOptions({
      classes,
      sections,
      activeAcademicYearId: "y1",
    });
    const eight = classOptions.find((item) => item.label === "Class 8")!;
    const secB = eight.sections.find((s) => s.label === "B")!;
    // Option value may be c8a (first/most sections), while Sec B belongs to c8b
    const placement = resolveStudentCreatePlacement({
      classOptions,
      sectionOptions,
      classValue: eight.value,
      sectionValue: secB.value,
    });
    expect(placement).toEqual({
      classId: "c8b",
      sectionId: "s8b-dup",
      academicYearId: "y1",
      classLabel: "Class 8",
      sectionLabel: "B",
    });
  });
});

describe("buildStudentSectionOptions", () => {
  it("builds a flat lookup with Class labels", () => {
    const options = buildStudentSectionOptions({
      classes,
      sections,
      activeAcademicYearId: "y1",
    });
    expect(options.map((item) => item.label)).toEqual([
      "Class 8 · A",
      "Class 8 · B",
      "Class 9 · A",
      "Class 9 · B",
    ]);
  });
});
