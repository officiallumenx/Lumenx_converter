/**
 * Resolve CSV class/section labels to catalog UUIDs for API bulk student import.
 * Creates missing active class/section rows when requested so bulk import can
 * fill an institute that only has a partial class tree (e.g. Class 8-A only).
 */
import {
  classCodeFromName,
  classIdentityKey,
  classSortRank,
  normalizeSchoolClassName,
  sectionIdentityKey,
  sectionSortRank,
} from "@/lib/classes/name-format";
import { createClass, createSection } from "@/lib/classes/mutations";
import type { ClassDto, SectionDto } from "@/lib/classes/types";

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
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

function findClass(
  classes: ClassDto[],
  className: string,
): ClassDto | undefined {
  const active = classes.filter((c) => c.status === "active");
  const key = classIdentityKey(className);
  if (key) {
    const byIdentity = active.find((c) => {
      const left =
        classIdentityKey(c.name ?? "") || classIdentityKey(c.code ?? "");
      return left === key;
    });
    if (byIdentity) return byIdentity;
  }

  return (
    active.find((c) => {
      const n = norm(className);
      return [c.name, c.code].some((v) => v && norm(v) === n);
    }) ??
    active.find((c) => {
      const n = norm(className);
      return (
        norm(c.name).includes(n) ||
        norm(c.code).includes(n) ||
        n.includes(norm(c.name)) ||
        n.includes(norm(c.code))
      );
    })
  );
}

function findSection(
  sections: SectionDto[],
  classId: string,
  sectionName: string,
): SectionDto | undefined {
  const classSections = sections.filter(
    (s) => s.classId === classId && s.status === "active",
  );
  if (classSections.length === 0) return undefined;

  const needle = sectionName.trim();
  if (!needle) {
    return classSections.length === 1 ? classSections[0] : undefined;
  }

  const key = sectionIdentityKey(needle);
  if (key) {
    const byIdentity = classSections.find((s) => {
      const left =
        sectionIdentityKey(s.code ?? "") || sectionIdentityKey(s.name ?? "");
      return left === key;
    });
    if (byIdentity) return byIdentity;
  }

  return (
    classSections.find((s) => {
      const n = norm(needle);
      return [s.name, s.code].some((v) => v && norm(v) === n);
    }) ??
    classSections.find((s) => {
      const n = norm(needle);
      return norm(s.name).includes(n) || norm(s.code).includes(n);
    })
  );
}

/** Preferred Excel labels for this institute (class name + section code/name). */
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
        .map((s) => {
          const code = s.code?.trim();
          const name = s.name?.trim();
          // Prefer short codes (A/B) for Excel; fall back to name.
          if (code && /^[A-Za-z]\d*$/.test(code)) return code.toUpperCase();
          if (name) {
            const fromName = sectionIdentityKey(name);
            if (fromName && /^[A-Z]\d*$/.test(fromName)) return fromName;
            return name;
          }
          return code || "";
        })
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
  const cls = findClass(classes, className);
  if (!cls) return null;

  const section = findSection(sections, cls.id, sectionName);
  if (!section) return null;

  return {
    classId: cls.id,
    sectionId: section.id,
    academicYearId: section.academicYearId || cls.academicYearId,
    classLabel: cls.name?.trim() || cls.code?.trim() || "Class",
    sectionLabel:
      section.code?.trim() ||
      sectionIdentityKey(section.name ?? "") ||
      section.name?.trim() ||
      "—",
  };
}

/**
 * Resolve placement, creating the class and/or section when missing.
 * Requires at least one existing class (for academic year) or an explicit year id.
 */
export async function resolveOrCreateStudentImportPlacement(input: {
  classes: ClassDto[];
  sections: SectionDto[];
  className: string;
  sectionName: string;
  instituteId: string;
  academicYearId?: string | null;
}): Promise<{
  placement: StudentImportPlacement | null;
  classes: ClassDto[];
  sections: SectionDto[];
  createdClass: boolean;
  createdSection: boolean;
}> {
  let classes = [...input.classes];
  let sections = [...input.sections];
  let createdClass = false;
  let createdSection = false;

  const existing = resolveStudentImportPlacement(
    classes,
    sections,
    input.className,
    input.sectionName,
  );
  if (existing) {
    return { placement: existing, classes, sections, createdClass, createdSection };
  }

  const academicYearId =
    input.academicYearId?.trim() ||
    classes.find((c) => c.academicYearId)?.academicYearId ||
    sections.find((s) => s.academicYearId)?.academicYearId ||
    "";
  if (!academicYearId) {
    return { placement: null, classes, sections, createdClass, createdSection };
  }

  const classLabel =
    normalizeSchoolClassName(input.className) ||
    input.className.trim() ||
    "Class";
  const sectionCode =
    sectionIdentityKey(input.sectionName) ||
    input.sectionName.trim().toUpperCase() ||
    "A";

  let cls = findClass(classes, classLabel);
  if (!cls) {
    cls = await createClass({
      instituteId: input.instituteId,
      academicYearId,
      name: classLabel,
      code: classCodeFromName(classLabel),
      sortOrder: classSortRank(classLabel),
      status: "active",
    });
    classes = [...classes, cls];
    createdClass = true;
  }

  let section = findSection(sections, cls.id, sectionCode);
  if (!section) {
    section = await createSection({
      instituteId: input.instituteId,
      academicYearId: cls.academicYearId || academicYearId,
      classId: cls.id,
      name: sectionCode,
      code: sectionCode,
      capacity: 40,
      sortOrder: sectionSortRank(sectionCode),
      status: "active",
    });
    sections = [...sections, section];
    createdSection = true;
  }

  const placement = resolveStudentImportPlacement(
    classes,
    sections,
    classLabel,
    sectionCode,
  );
  return { placement, classes, sections, createdClass, createdSection };
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
