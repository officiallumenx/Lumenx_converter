import { describe, expect, it } from "vitest";
import type { ClassDto, SectionDto } from "@/lib/classes/types";
import {
  matchSectionIdsByTeacherLabels,
  teacherImportSectionLabels,
  unmatchedTeacherSectionLabels,
} from "./bulk-import-resolve";

const classes: ClassDto[] = [
  {
    id: "class-6",
    instituteId: "inst",
    academicYearId: "year",
    name: "Grade 6",
    code: "G6",
    sortOrder: 6,
    status: "active",
    createdAt: "",
    updatedAt: "",
  },
];

const sections: SectionDto[] = [
  {
    id: "sec-a",
    instituteId: "inst",
    academicYearId: "year",
    classId: "class-6",
    name: "A",
    code: "A",
    capacity: 40,
    room: null,
    sortOrder: 1,
    status: "active",
    classTeacherId: null,
    createdAt: "",
    updatedAt: "",
  },
];

describe("teacher bulk import resolve", () => {
  it("builds catalog labels and matches independently", () => {
    expect(teacherImportSectionLabels(sections, classes)).toContain("G6-A");
    expect(matchSectionIdsByTeacherLabels(["G6-A"], sections, classes)).toEqual([
      "sec-a",
    ]);
  });

  it("reports unmatched labels without inventing assignments", () => {
    expect(
      unmatchedTeacherSectionLabels(["G6-A", "G99-Z"], sections, classes),
    ).toEqual(["G99-Z"]);
    expect(
      unmatchedTeacherSectionLabels(["G99-Z"], sections, classes),
    ).toEqual(["G99-Z"]);
  });
});
