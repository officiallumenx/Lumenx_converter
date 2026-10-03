import { describe, expect, it } from "vitest";
import {
  mapImportGender,
  resolveStudentImportPlacement,
  studentImportCatalogOptions,
} from "./bulk-import";
import type { ClassDto, SectionDto } from "@/lib/classes/types";

const classes: ClassDto[] = [
  {
    id: "c1",
    instituteId: "i",
    academicYearId: "y",
    name: "Grade 10",
    code: "G10",
    sortOrder: 1,
    status: "active",
    createdAt: "",
    updatedAt: "",
  },
];

const sections: SectionDto[] = [
  {
    id: "s1",
    instituteId: "i",
    academicYearId: "y",
    classId: "c1",
    name: "Section A",
    code: "A",
    capacity: 40,
    room: null,
    sortOrder: 1,
    status: "active",
    createdAt: "",
    updatedAt: "",
  },
];

describe("student bulk import placement", () => {
  it("resolves class name + section code", () => {
    const placement = resolveStudentImportPlacement(classes, sections, "Grade 10", "A");
    expect(placement?.classId).toBe("c1");
    expect(placement?.sectionId).toBe("s1");
  });

  it("resolves Class/Grade aliases and Sec prefixes", () => {
    const placement = resolveStudentImportPlacement(
      classes,
      sections,
      "Class 10",
      "Sec A",
    );
    expect(placement?.classId).toBe("c1");
    expect(placement?.sectionId).toBe("s1");
  });

  it("resolves section B on a sibling Class 8 row (not the first match)", () => {
    const siblingClasses: ClassDto[] = [
      {
        id: "c8a",
        instituteId: "i",
        academicYearId: "y",
        name: "Class 8",
        code: "CLASS-8",
        sortOrder: 8,
        status: "active",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "c8b",
        instituteId: "i",
        academicYearId: "y",
        name: "Grade 8",
        code: "G8",
        sortOrder: 8,
        status: "active",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const siblingSections: SectionDto[] = [
      {
        id: "s8a",
        instituteId: "i",
        academicYearId: "y",
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
        id: "s8b",
        instituteId: "i",
        academicYearId: "y",
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
    const placementA = resolveStudentImportPlacement(
      siblingClasses,
      siblingSections,
      "Class 8",
      "A",
    );
    const placementB = resolveStudentImportPlacement(
      siblingClasses,
      siblingSections,
      "Class 8",
      "B",
    );
    expect(placementA?.classId).toBe("c8a");
    expect(placementA?.sectionId).toBe("s8a");
    expect(placementB?.classId).toBe("c8b");
    expect(placementB?.sectionId).toBe("s8b");
  });

  it("builds catalog options for Excel dropdowns", () => {
    const options = studentImportCatalogOptions(classes, sections);
    expect(options).toEqual([
      { classLabel: "Grade 10", sectionLabels: ["A"] },
    ]);
  });

  it("maps gender values", () => {
    expect(mapImportGender("Female")).toBe("female");
    expect(mapImportGender("Prefer not to say")).toBe("prefer_not_to_say");
  });
});
