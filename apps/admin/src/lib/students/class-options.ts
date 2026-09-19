/**
 * Build class → section select options for student create / bulk import.
 */
import type { ClassDto, SectionDto } from "@/lib/classes/types";
import type { StudentClassOption } from "@/components/students/StudentCreateDialog";
import {
  classIdentityKey,
  classSortRank,
  normalizeSchoolClassName,
  sectionSortRank,
} from "@/lib/classes/name-format";

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

type LooseClass = ClassDto & { sort_order?: number; academic_year_id?: string };
type LooseSection = SectionDto & {
  class_id?: string;
  sort_order?: number;
  academic_year_id?: string;
  class_teacher_id?: string | null;
};

function asClass(row: LooseClass): ClassDto {
  return {
    id: row.id,
    instituteId: row.instituteId,
    academicYearId: row.academicYearId || row.academic_year_id || "",
    name: row.name,
    code: row.code,
    sortOrder: row.sortOrder ?? row.sort_order ?? 0,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function asSection(row: LooseSection): SectionDto {
  return {
    id: row.id,
    instituteId: row.instituteId,
    academicYearId: row.academicYearId || row.academic_year_id || "",
    classId: row.classId || row.class_id || "",
    name: row.name,
    code: row.code,
    capacity: row.capacity,
    room: row.room,
    sortOrder: row.sortOrder ?? row.sort_order ?? 0,
    status: row.status,
    classTeacherId: row.classTeacherId ?? row.class_teacher_id ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Prefer "Class 8" — never show redundant "Class 8 (CLASS-8)" or Grade wording. */
function classLabel(cls: ClassDto): string {
  const fromName = normalizeSchoolClassName(cls.name || "");
  if (fromName) return fromName;
  const fromCode = normalizeSchoolClassName(cls.code || "");
  return fromCode || "Class";
}

function sectionLabel(section: SectionDto): string {
  const name = section.name?.trim() || "";
  const code = section.code?.trim() || "";
  if (name && code && name.toLowerCase() !== code.toLowerCase()) {
    // Prefer short section letter/code when name is verbose
    if (code.length <= 4) return code.toUpperCase();
    return name;
  }
  return (name || code || "Section").toUpperCase();
}

function compareClasses(a: ClassDto, b: ClassDto): number {
  const rank = classSortRank(a.name || a.code) - classSortRank(b.name || b.code);
  if (rank !== 0) return rank;
  const stored = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  if (stored !== 0) return stored;
  const labelCmp = collator.compare(classLabel(a), classLabel(b));
  if (labelCmp !== 0) return labelCmp;
  return collator.compare(a.id, b.id);
}

function compareSections(a: SectionDto, b: SectionDto): number {
  const rank =
    sectionSortRank(a.code || a.name) - sectionSortRank(b.code || b.name);
  if (rank !== 0) return rank;
  const labelCmp = collator.compare(sectionLabel(a), sectionLabel(b));
  if (labelCmp !== 0) return labelCmp;
  // sortOrder only as last resort — API often stores creation order (B before A)
  const order = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  if (order !== 0) return order;
  return collator.compare(a.id, b.id);
}

/** Treat missing status as enrollable; only exclude explicit inactive. */
function isEnrollableStatus(status: string | null | undefined): boolean {
  return status !== "inactive";
}

export type StudentSectionOption = {
  /** Section UUID — primary select value. */
  value: string;
  label: string;
  classId: string;
  sectionId: string;
  academicYearId: string;
  classLabel: string;
  sectionLabel: string;
};

export type BuildStudentClassOptionsInput = {
  classes: ClassDto[];
  sections: SectionDto[];
  /** When set, prefer / restrict to this academic year (avoids duplicate Class 8 across years). */
  activeAcademicYearId?: string | null;
};

/**
 * Hierarchical class options (class select → section select).
 * Dedupes equivalent names (Grade 8 / Class 8 / 8) and prefers the active year.
 * If the active year has classes but no sections, falls back to all years so
 * create-student is not blocked by a year mismatch.
 */
export function buildStudentClassOptions(
  classesOrInput: ClassDto[] | BuildStudentClassOptionsInput,
  sectionsArg?: SectionDto[],
  activeAcademicYearIdArg?: string | null,
): StudentClassOption[] {
  const input: BuildStudentClassOptionsInput = Array.isArray(classesOrInput)
    ? {
        classes: classesOrInput,
        sections: sectionsArg ?? [],
        activeAcademicYearId: activeAcademicYearIdArg,
      }
    : classesOrInput;

  const primary = buildStudentClassOptionsForYear(input);
  if (
    !input.activeAcademicYearId ||
    primary.some((item) => item.sections.length > 0)
  ) {
    return primary;
  }
  return buildStudentClassOptionsForYear({
    ...input,
    activeAcademicYearId: null,
  });
}

function buildStudentClassOptionsForYear(
  input: BuildStudentClassOptionsInput,
): StudentClassOption[] {
  const { classes, sections, activeAcademicYearId } = input;
  let classRows = classes.map(asClass).filter((item) => item.id);
  const sectionRows = sections.map(asSection).filter((item) => item.id && item.classId);

  if (activeAcademicYearId) {
    const inYear = classRows.filter((cls) => cls.academicYearId === activeAcademicYearId);
    if (inYear.length > 0) classRows = inYear;
  }

  const activeSections = sectionRows.filter((item) => {
    if (!isEnrollableStatus(item.status)) return false;
    if (activeAcademicYearId && item.academicYearId && item.academicYearId !== activeAcademicYearId) {
      return false;
    }
    return true;
  });
  const sectionsByClassId = new Map<string, SectionDto[]>();
  for (const section of activeSections) {
    const list = sectionsByClassId.get(section.classId) ?? [];
    list.push(section);
    sectionsByClassId.set(section.classId, list);
  }

  const enrollable = classRows.filter(
    (cls) => isEnrollableStatus(cls.status) || sectionsByClassId.has(cls.id),
  );

  // Dedupe Grade 8 / Class 8 / 8 — keep the row with most sections, then active year, then name "Class …".
  const byIdentity = new Map<string, ClassDto>();
  for (const cls of enrollable) {
    const key =
      classIdentityKey(cls.name) ||
      classIdentityKey(cls.code) ||
      cls.id;
    const prev = byIdentity.get(key);
    if (!prev) {
      byIdentity.set(key, cls);
      continue;
    }
    const prevSections = sectionsByClassId.get(prev.id)?.length ?? 0;
    const nextSections = sectionsByClassId.get(cls.id)?.length ?? 0;
    if (nextSections > prevSections) {
      byIdentity.set(key, cls);
      continue;
    }
    if (nextSections < prevSections) continue;
    if (
      activeAcademicYearId &&
      cls.academicYearId === activeAcademicYearId &&
      prev.academicYearId !== activeAcademicYearId
    ) {
      byIdentity.set(key, cls);
      continue;
    }
    const prevLabel = classLabel(prev);
    const nextLabel = classLabel(cls);
    if (nextLabel.startsWith("Class ") && !prevLabel.startsWith("Class ")) {
      byIdentity.set(key, cls);
    }
  }

  const rows = [...byIdentity.values()].sort(compareClasses);

  return rows.map((cls) => {
    // Merge sections from all duplicate class ids that share this identity
    // so students still see every section even if duplicates existed historically.
    const identity =
      classIdentityKey(cls.name) || classIdentityKey(cls.code) || cls.id;
    const siblingIds = enrollable
      .filter(
        (row) =>
          (classIdentityKey(row.name) || classIdentityKey(row.code) || row.id) ===
          identity,
      )
      .map((row) => row.id);
    const mergedSections = new Map<string, SectionDto>();
    for (const id of siblingIds) {
      for (const section of sectionsByClassId.get(id) ?? []) {
        const secKey =
          section.code?.trim().toUpperCase() ||
          section.name?.trim().toUpperCase() ||
          section.id;
        if (!mergedSections.has(secKey)) mergedSections.set(secKey, section);
      }
    }
    const classSections = [...mergedSections.values()].sort(compareSections);
    return {
      value: cls.id,
      label: classLabel(cls),
      classId: cls.id,
      academicYearId: cls.academicYearId,
      sections: classSections.map((section) => ({
        value: section.id,
        label: sectionLabel(section),
        sectionId: section.id,
        classId: section.classId || cls.id,
        academicYearId: section.academicYearId || cls.academicYearId,
      })),
    };
  });
}

/**
 * Flat list of every enrollable class + section pair (bulk import / lookups).
 */
export function buildStudentSectionOptions(
  classesOrInput: ClassDto[] | BuildStudentClassOptionsInput,
  sectionsArg?: SectionDto[],
  activeAcademicYearIdArg?: string | null,
): StudentSectionOption[] {
  const hierarchical = buildStudentClassOptions(
    classesOrInput,
    sectionsArg,
    activeAcademicYearIdArg,
  );
  const pairs: StudentSectionOption[] = [];
  for (const cls of hierarchical) {
    for (const section of cls.sections) {
      pairs.push({
        value: section.value,
        label: `${cls.label} · ${section.label}`,
        // Always the section's real class — may differ from the deduped option id
        // when Grade 8 / Class 8 rows were merged for the select UI.
        classId: section.classId || cls.classId || cls.value,
        sectionId: section.sectionId ?? section.value,
        academicYearId: section.academicYearId || cls.academicYearId || "",
        classLabel: cls.label,
        sectionLabel: section.label,
      });
    }
  }

  return pairs.sort((a, b) => {
    const classRank =
      classSortRank(a.classLabel) - classSortRank(b.classLabel);
    if (classRank !== 0) return classRank;
    const classCmp = collator.compare(a.classLabel, b.classLabel);
    if (classCmp !== 0) return classCmp;
    const sectionRank =
      sectionSortRank(a.sectionLabel) - sectionSortRank(b.sectionLabel);
    if (sectionRank !== 0) return sectionRank;
    return collator.compare(a.sectionLabel, b.sectionLabel);
  });
}

export type StudentCreatePlacement = {
  classId: string;
  sectionId: string;
  academicYearId: string;
  classLabel: string;
  sectionLabel: string;
};

/**
 * Resolve enrollment UUIDs from the create dialog draft.
 * Prefer the section row's own classId / academicYearId so merged duplicate
 * class labels (Grade 8 + Class 8) still enroll against the real section.
 */
export function resolveStudentCreatePlacement(input: {
  classOptions: StudentClassOption[];
  sectionOptions: StudentSectionOption[];
  classValue: string;
  sectionValue: string;
}): StudentCreatePlacement | null {
  const classNeedle = input.classValue.trim();
  const sectionNeedle = input.sectionValue.trim();
  if (!sectionNeedle) return null;

  const selectedClass = input.classOptions.find(
    (item) => item.value === classNeedle || item.classId === classNeedle,
  );
  const selectedSection = selectedClass?.sections.find(
    (item) => item.value === sectionNeedle || item.sectionId === sectionNeedle,
  );
  const flat = input.sectionOptions.find(
    (item) => item.value === sectionNeedle || item.sectionId === sectionNeedle,
  );

  const sectionId =
    selectedSection?.sectionId ?? selectedSection?.value ?? flat?.sectionId;
  const classId =
    selectedSection?.classId ??
    flat?.classId ??
    selectedClass?.classId ??
    selectedClass?.value;
  const academicYearId =
    selectedSection?.academicYearId ??
    flat?.academicYearId ??
    selectedClass?.academicYearId;

  if (!classId || !sectionId || !academicYearId) return null;

  return {
    classId,
    sectionId,
    academicYearId,
    classLabel: selectedClass?.label ?? flat?.classLabel ?? "",
    sectionLabel: selectedSection?.label ?? flat?.sectionLabel ?? "",
  };
}
