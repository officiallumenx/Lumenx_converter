import { describe, expect, it } from "vitest";
import {
  clearSelectionInScope,
  filterSelectableStudents,
  selectAllInScope,
  selectEntireClass,
  toggleStudentId,
  uniqueClassLabels,
  uniqueSectionLabels,
} from "./student-selection";

const students = [
  {
    id: "1",
    displayName: "Aanya",
    classLabel: "10",
    sectionLabel: "A",
    admissionNumber: "A1",
    academicYearId: "y1",
  },
  {
    id: "2",
    displayName: "Bharat",
    classLabel: "10",
    sectionLabel: "B",
    admissionNumber: "B1",
    academicYearId: "y1",
  },
  {
    id: "3",
    displayName: "Chitra",
    classLabel: "9",
    sectionLabel: "A",
    admissionNumber: "C1",
    academicYearId: "y2",
  },
];

describe("docs-certs student selection", () => {
  it("filters by class, section, year, and query", () => {
    expect(
      filterSelectableStudents(students, { classLabel: "10" }).map((s) => s.id),
    ).toEqual(["1", "2"]);
    expect(
      filterSelectableStudents(students, {
        classLabel: "10",
        sectionLabel: "A",
      }).map((s) => s.id),
    ).toEqual(["1"]);
    expect(
      filterSelectableStudents(students, { academicYearId: "y2" }).map((s) => s.id),
    ).toEqual(["3"]);
    expect(
      filterSelectableStudents(students, { query: "bhar" }).map((s) => s.id),
    ).toEqual(["2"]);
  });

  it("lists unique class and section labels", () => {
    expect(uniqueClassLabels(students)).toEqual(["9", "10"]);
    expect(uniqueSectionLabels(students, "10")).toEqual(["A", "B"]);
  });

  it("supports toggle, select-all, clear-in-scope, and entire class", () => {
    let selected = new Set<string>();
    selected = toggleStudentId(selected, "1");
    expect([...selected]).toEqual(["1"]);
    selected = toggleStudentId(selected, "1");
    expect([...selected]).toEqual([]);

    selected = selectAllInScope(new Set(["3"]), ["1", "2"]);
    expect([...selected].sort()).toEqual(["1", "2", "3"]);

    selected = clearSelectionInScope(selected, ["1", "2"]);
    expect([...selected]).toEqual(["3"]);

    selected = selectEntireClass(new Set(), students, "10", "A");
    expect([...selected]).toEqual(["1"]);
  });
});
