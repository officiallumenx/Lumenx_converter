import { getAcademicConfig, getDepartmentById, isCollegeMode } from "@/lib/academic-data";

export type ClassFilter = "all" | string;
export type SectionFilter = "all" | string;
export type DepartmentFilter = "all" | string;

export type ParsedCollegeBatch = {
  departmentCode: string;
  yearShort: string;
  section: string;
};

export function getClassFilterOptions(): readonly string[] {
  const { levels } = getAcademicConfig();
  return levels.map((l) => l.shortLabel);
}

export function getSectionFilterOptions(): readonly string[] {
  return getAcademicConfig().sections;
}

export function getDepartmentFilterOptions(): readonly string[] {
  return getAcademicConfig().departments.map((d) => d.code);
}

/** @deprecated Use getClassFilterOptions() */
export const CLASS_OPTIONS = ["9", "10", "11", "12"] as const;

/** @deprecated Use getSectionFilterOptions() */
export const SECTION_OPTIONS = ["A", "B", "C", "D"] as const;

/** Parses school "10-A" or college "MPC-FY-A" */
export function parseCollegeBatch(grade: string): ParsedCollegeBatch | null {
  const m = grade.trim().match(/^([A-Z]{2,4})-(FY|SY)-([A-D])$/i);
  if (!m) return null;
  return {
    departmentCode: m[1]!.toUpperCase(),
    yearShort: m[2]!.toUpperCase(),
    section: m[3]!.toUpperCase(),
  };
}

/** Parses stored class label e.g. "10-A" or legacy "FY-A" */
export function parseClassSection(grade: string): { classNum: string; section: string } | null {
  const college = parseCollegeBatch(grade);
  if (college) return { classNum: college.yearShort, section: college.section };

  const trimmed = grade.trim();
  const school = trimmed.match(/^(\d{1,2})-([A-D])$/i);
  if (school) return { classNum: school[1]!, section: school[2]!.toUpperCase() };
  const legacyCollege = trimmed.match(/^([A-Z]{2})-([A-D])$/i);
  if (legacyCollege) return { classNum: legacyCollege[1]!.toUpperCase(), section: legacyCollege[2]!.toUpperCase() };
  return null;
}

export function formatClassSection(classNum: string, section: string): string {
  return `${classNum}-${section.toUpperCase()}`;
}

export function formatCollegeBatch(deptCode: string, yearShort: string, section: string): string {
  return `${deptCode.toUpperCase()}-${yearShort.toUpperCase()}-${section.toUpperCase()}`;
}

export function matchesClassSection(
  grade: string,
  classFilter: ClassFilter,
  sectionFilter: SectionFilter,
  departmentFilter: DepartmentFilter = "all",
): boolean {
  if (isCollegeMode()) {
    const batch = parseCollegeBatch(grade);
    if (!batch) return departmentFilter === "all" && classFilter === "all" && sectionFilter === "all";
    if (departmentFilter !== "all" && batch.departmentCode !== departmentFilter) return false;
    if (classFilter !== "all" && batch.yearShort !== classFilter) return false;
    if (sectionFilter !== "all" && batch.section !== sectionFilter) return false;
    return true;
  }

  const parsed = parseClassSection(grade);
  if (!parsed) return classFilter === "all" && sectionFilter === "all";
  if (classFilter !== "all" && parsed.classNum !== classFilter) return false;
  if (sectionFilter !== "all" && parsed.section !== sectionFilter) return false;
  return true;
}

export function classSectionLabel(
  classFilter: ClassFilter,
  sectionFilter: SectionFilter,
  departmentFilter: DepartmentFilter = "all",
): string {
  const { levelLabel } = getAcademicConfig();
  const allLabel = isCollegeMode() ? "All batches" : "All classes";

  if (departmentFilter === "all" && classFilter === "all" && sectionFilter === "all") {
    return allLabel;
  }

  if (isCollegeMode()) {
    const parts: string[] = [];
    if (departmentFilter !== "all") parts.push(departmentFilter);
    if (classFilter !== "all") {
      const level = getAcademicConfig().levels.find((l) => l.shortLabel === classFilter);
      parts.push(level?.label ?? classFilter);
    }
    if (sectionFilter !== "all") parts.push(`Sec ${sectionFilter}`);
    return parts.length > 0 ? parts.join(" · ") : allLabel;
  }

  if (classFilter !== "all" && sectionFilter !== "all") {
    const level = getAcademicConfig().levels.find((l) => l.shortLabel === classFilter);
    const levelText = level?.label ?? `${levelLabel} ${classFilter}`;
    return `${levelText}-${sectionFilter}`;
  }
  if (classFilter !== "all") {
    const level = getAcademicConfig().levels.find((l) => l.shortLabel === classFilter);
    const levelText = level?.label ?? `${levelLabel} ${classFilter}`;
    return `${levelText} · all sections`;
  }
  return `Section ${sectionFilter} · all ${isCollegeMode() ? "years" : "grades"}`;
}

export function formatStudentGradeDisplay(grade: string): string {
  const batch = parseCollegeBatch(grade);
  if (batch) {
    const level = getAcademicConfig().levels.find((l) => l.shortLabel === batch.yearShort);
    return `${batch.departmentCode} · ${level?.label ?? batch.yearShort} · Sec ${batch.section}`;
  }

  const parsed = parseClassSection(grade);
  if (!parsed) return grade;
  const level = getAcademicConfig().levels.find((l) => l.shortLabel === parsed.classNum);
  if (level) return `${level.label} · Sec ${parsed.section}`;
  return `Grade ${parsed.classNum}-${parsed.section}`;
}

export function getDepartmentNameForBatch(grade: string): string | undefined {
  const batch = parseCollegeBatch(grade);
  if (!batch) return undefined;
  const dept = getAcademicConfig().departments.find((d) => d.code === batch.departmentCode);
  return dept?.name;
}
