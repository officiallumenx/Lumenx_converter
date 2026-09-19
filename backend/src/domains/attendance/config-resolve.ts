import type { AttendanceConfigVersionRow } from "./types.js";

/**
 * Flowchart configuration scope resolution: section → class → institute.
 * Within each scope, pick the newest effective_from on/before the attendance date.
 */
export function pickConfigForSection(
  configs: AttendanceConfigVersionRow[],
  attendanceDate: string,
  classCode: string,
  sectionCode: string,
): AttendanceConfigVersionRow | null {
  const dated = configs
    .filter((c) => c.effective_from <= attendanceDate)
    .sort((a, b) => {
      const byDate = b.effective_from.localeCompare(a.effective_from);
      if (byDate !== 0) return byDate;
      return b.created_at.localeCompare(a.created_at);
    });

  const sectionHit = dated.find(
    (c) =>
      c.scope === "section" &&
      Array.isArray(c.section_codes) &&
      c.section_codes.some((code) => String(code).trim() === sectionCode.trim()),
  );
  if (sectionHit) return sectionHit;

  const classHit = dated.find(
    (c) =>
      c.scope === "class" &&
      Array.isArray(c.class_codes) &&
      c.class_codes.some((code) => String(code).trim() === classCode.trim()),
  );
  if (classHit) return classHit;

  return dated.find((c) => c.scope === "institute") ?? null;
}
