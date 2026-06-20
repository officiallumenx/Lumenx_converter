export const CLASS_OPTIONS = ["9", "10", "11", "12"] as const;
export const SECTION_OPTIONS = ["A", "B", "C", "D"] as const;

export type ClassFilter = "all" | (typeof CLASS_OPTIONS)[number];
export type SectionFilter = "all" | (typeof SECTION_OPTIONS)[number];

/** Parses stored class label e.g. "10-A" → { classNum: "10", section: "A" } */
export function parseClassSection(grade: string): { classNum: string; section: string } | null {
  const m = grade.trim().match(/^(\d{1,2})-([A-D])$/i);
  if (!m) return null;
  return { classNum: m[1], section: m[2].toUpperCase() };
}

export function formatClassSection(classNum: string, section: string): string {
  return `${classNum}-${section.toUpperCase()}`;
}

export function matchesClassSection(
  grade: string,
  classFilter: ClassFilter,
  sectionFilter: SectionFilter,
): boolean {
  const parsed = parseClassSection(grade);
  if (!parsed) return classFilter === "all" && sectionFilter === "all";
  if (classFilter !== "all" && parsed.classNum !== classFilter) return false;
  if (sectionFilter !== "all" && parsed.section !== sectionFilter) return false;
  return true;
}

export function classSectionLabel(classFilter: ClassFilter, sectionFilter: SectionFilter): string {
  if (classFilter === "all" && sectionFilter === "all") return "All classes";
  if (classFilter !== "all" && sectionFilter !== "all") return `Grade ${classFilter}-${sectionFilter}`;
  if (classFilter !== "all") return `Grade ${classFilter} · all sections`;
  return `Section ${sectionFilter} · all grades`;
}
