/**
 * Resolve CSV class/section labels to catalog UUIDs for API bulk student import.
 */
import type { ClassDto, SectionDto } from "@/lib/classes/types";

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function classMatches(cls: ClassDto, needle: string): boolean {
  const n = norm(needle);
  if (!n) return false;
  return [cls.name, cls.code].some((v) => v && norm(v) === n);
}

function sectionMatches(section: SectionDto, needle: string): boolean {
  const n = norm(needle);
  if (!n) return false;
  return [section.name, section.code].some((v) => v && norm(v) === n);
}

export type StudentImportPlacement = {
  classId: string;
  sectionId: string;
  academicYearId: string;
  classLabel: string;
  sectionLabel: string;
};

export type StudentImportClassOption = {
  classLabel: string;
  sectionLabels: string[];
};

/** Preferred Excel labels for this institute (class name + section name/code). */
export function studentImportCatalogOptions(
  classes: ClassDto[],
  sections: SectionDto[],
): StudentImportClassOption[] {
  const activeClasses = classes
    .filter((c) => c.status === "active")
    .slice()
    .sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code));

  return activeClasses
    .map((cls) => {
      const classLabel = cls.name?.trim() || cls.code?.trim() || "";
      if (!classLabel) return null;
      const sectionLabels = sections
        .filter((s) => s.classId === cls.id && s.status === "active")
        .map((s) => s.name?.trim() || s.code?.trim() || "")
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      const unique = [...new Set(sectionLabels)];
      if (unique.length === 0) return null;
      return { classLabel, sectionLabels: unique };
    })
    .filter((item): item is StudentImportClassOption => item !== null);
}

export function resolveStudentImportPlacement(
  classes: ClassDto[],
  sections: SectionDto[],
  className: string,
  sectionName: string,
): StudentImportPlacement | null {
  const activeClasses = classes.filter((c) => c.status === "active");
  const cls =
    activeClasses.find((c) => classMatches(c, className)) ??
    activeClasses.find((c) => {
      const n = norm(className);
      return (
        norm(c.name).includes(n) ||
        norm(c.code).includes(n) ||
        n.includes(norm(c.name)) ||
        n.includes(norm(c.code))
      );
    });
  if (!cls) return null;

  const classSections = sections.filter(
    (s) => s.classId === cls.id && s.status === "active",
  );
  if (classSections.length === 0) return null;

  const sectionNeedle = sectionName.trim();
  let section: SectionDto | undefined;
  if (sectionNeedle) {
    section =
      classSections.find((s) => sectionMatches(s, sectionNeedle)) ??
      classSections.find((s) => {
        const n = norm(sectionNeedle);
        return norm(s.name).includes(n) || norm(s.code).includes(n);
      });
  } else if (classSections.length === 1) {
    section = classSections[0];
  }
  if (!section) return null;

  return {
    classId: cls.id,
    sectionId: section.id,
    academicYearId: section.academicYearId || cls.academicYearId,
    classLabel: cls.name?.trim() || cls.code?.trim() || "Class",
    sectionLabel: section.code?.trim() || section.name?.trim() || "—",
  };
}

export function mapImportGender(
  raw: string,
): "female" | "male" | "other" | "prefer_not_to_say" {
  const g = raw.trim().toLowerCase();
  if (g === "female") return "female";
  if (g === "male") return "male";
  if (g === "prefer not to say" || g === "prefer_not_to_say") {
    return "prefer_not_to_say";
  }
  return "other";
}
