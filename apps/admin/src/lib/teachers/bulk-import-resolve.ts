import type { ClassDto, SectionDto } from "@/lib/classes/types";

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

/** Canonical import labels for this institute (e.g. G10-A). */
export function teacherImportSectionLabels(
  sections: SectionDto[],
  classes: ClassDto[],
): string[] {
  const classesById = new Map(classes.map((c) => [c.id, c]));
  const labels: string[] = [];
  for (const section of sections) {
    if (section.status !== "active") continue;
    const cls = classesById.get(section.classId);
    const classCode = cls?.code?.trim() || cls?.name?.trim();
    if (!classCode) continue;
    const sectionCode = section.code?.trim() || section.name?.trim();
    if (!sectionCode) continue;
    labels.push(`${classCode}-${sectionCode}`);
  }
  return [...new Set(labels)].sort((a, b) => a.localeCompare(b));
}

/** Match Admin labels (e.g. G10-A) to live section UUIDs. */
export function matchSectionIdsByTeacherLabels(
  labels: string[],
  sections: SectionDto[],
  classes: ClassDto[],
): string[] {
  if (!labels.length) return [];
  const classesById = new Map(classes.map((c) => [c.id, c]));
  const needles = labels.map(norm).filter(Boolean);
  if (needles.length === 0) return [];

  const matched: string[] = [];
  for (const section of sections) {
    if (section.status !== "active") continue;
    const cls = classesById.get(section.classId);
    const candidates = [
      `${cls?.code ?? ""}-${section.code}`,
      `${cls?.name ?? ""}-${section.name}`,
      `${cls?.code ?? ""}-${section.name}`,
      `${cls?.name ?? ""}-${section.code}`,
      section.code,
      section.name,
    ].map(norm);
    if (needles.some((needle) => candidates.includes(needle))) {
      matched.push(section.id);
    }
  }
  return [...new Set(matched)];
}

/** Labels that do not match any active institute section. */
export function unmatchedTeacherSectionLabels(
  labels: string[],
  sections: SectionDto[],
  classes: ClassDto[],
): string[] {
  const known = new Set(teacherImportSectionLabels(sections, classes).map(norm));
  // Also accept alternate forms that matchSectionIdsByTeacherLabels can resolve.
  const unresolved: string[] = [];
  for (const label of labels) {
    const trimmed = label.trim();
    if (!trimmed) continue;
    if (known.has(norm(trimmed))) continue;
    const ids = matchSectionIdsByTeacherLabels([trimmed], sections, classes);
    if (ids.length === 0) unresolved.push(trimmed);
  }
  return unresolved;
}
