/**
 * Student Reports Home — category entry points within Reporting Center.
 * Filters the live catalog; does not invent unsupported report types.
 */

import type { ReportDefinitionDto } from "./types";

export type StudentReportCategoryId =
  | "directory"
  | "attendance"
  | "exams"
  | "fees"
  | "admissions";

export type StudentReportCategory = {
  id: StudentReportCategoryId;
  label: string;
  description: string;
  /** Catalog module names and/or report ids that belong in this category. */
  moduleNames: string[];
  reportIds?: string[];
};

export const STUDENT_REPORT_CATEGORIES: StudentReportCategory[] = [
  {
    id: "directory",
    label: "Directory & enrollment",
    description: "Student roster export for the institute.",
    moduleNames: ["Students"],
    reportIds: ["students"],
  },
  {
    id: "attendance",
    label: "Attendance",
    description: "Daily, weekly, student, class, and section attendance CSVs.",
    moduleNames: ["Attendance"],
  },
  {
    id: "exams",
    label: "Examinations",
    description: "Published exam marks (optional academic-year filter).",
    moduleNames: ["Marks"],
    reportIds: ["marks"],
  },
  {
    id: "fees",
    label: "Fees & dues",
    description: "Fee ledger and payments for authorized finance roles.",
    moduleNames: ["Fees"],
    reportIds: ["fees"],
  },
  {
    id: "admissions",
    label: "Admissions",
    description: "Application register export.",
    moduleNames: ["Admissions"],
    reportIds: ["admissions"],
  },
];

export function filterCatalogForStudentCategory(
  catalog: ReportDefinitionDto[],
  categoryId: StudentReportCategoryId | "all",
): ReportDefinitionDto[] {
  if (categoryId === "all") return catalog;
  const category = STUDENT_REPORT_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return catalog;
  const idSet = new Set(category.reportIds ?? []);
  const moduleSet = new Set(category.moduleNames);
  return catalog.filter(
    (r) => moduleSet.has(r.module) || idSet.has(r.id),
  );
}

export function studentCategoryHint(
  categoryId: StudentReportCategoryId | "all",
): string {
  if (categoryId === "all") {
    return "Full export catalog. Use Student reports categories for focused student workflows.";
  }
  return (
    STUDENT_REPORT_CATEGORIES.find((c) => c.id === categoryId)?.description ??
    ""
  );
}
