import { describe, expect, it } from "vitest";
import {
  filterCatalogForStudentCategory,
  STUDENT_REPORT_CATEGORIES,
  studentCategoryHint,
} from "./student-reports-home";
import type { ReportDefinitionDto } from "./types";

const catalog: ReportDefinitionDto[] = [
  { id: "students", name: "Roster", module: "Students", generationSupported: true },
  { id: "attendance-daily", name: "Daily", module: "Attendance", generationSupported: true },
  { id: "marks", name: "Marks", module: "Marks", generationSupported: true },
  { id: "fees", name: "Fees", module: "Fees", generationSupported: true },
  { id: "teachers", name: "Teachers", module: "Teachers", generationSupported: true },
];

describe("student reports home", () => {
  it("defines focused student categories without inventing modules", () => {
    expect(STUDENT_REPORT_CATEGORIES.length).toBeGreaterThanOrEqual(4);
    expect(STUDENT_REPORT_CATEGORIES.every((c) => c.label && c.description)).toBe(
      true,
    );
  });

  it("filters catalog by student category", () => {
    expect(filterCatalogForStudentCategory(catalog, "all")).toHaveLength(5);
    expect(
      filterCatalogForStudentCategory(catalog, "directory").map((r) => r.id),
    ).toEqual(["students"]);
    expect(
      filterCatalogForStudentCategory(catalog, "attendance").every(
        (r) => r.module === "Attendance",
      ),
    ).toBe(true);
    expect(filterCatalogForStudentCategory(catalog, "exams").map((r) => r.id)).toEqual([
      "marks",
    ]);
  });

  it("returns category hints", () => {
    expect(studentCategoryHint("all")).toMatch(/Student reports/i);
    expect(studentCategoryHint("fees")).toMatch(/Fee/i);
  });
});
