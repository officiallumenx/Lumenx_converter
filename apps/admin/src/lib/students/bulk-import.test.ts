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

  it("builds catalog options for Excel dropdowns", () => {
    const options = studentImportCatalogOptions(classes, sections);
    expect(options).toEqual([
      { classLabel: "Grade 10", sectionLabels: ["Section A"] },
    ]);
  });

  it("maps gender values", () => {
    expect(mapImportGender("Female")).toBe("female");
    expect(mapImportGender("Prefer not to say")).toBe("prefer_not_to_say");
  });
});
