import type { ClassDto, ClassListItem, SectionDetailItem, SectionDto } from "./types";
import type { SectionEnrichment } from "./enrich";
import {
  classIdentityKey,
  classSortRank,
  normalizeSchoolClassName,
  sectionIdentityKey,
  sectionSortRank,
} from "./name-format";

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export function classLabelForSection(
  section: SectionDto,
  classesById: Map<string, ClassDto>,
): string {
  const cls = classesById.get(section.classId);
  if (cls?.name?.trim()) return normalizeSchoolClassName(cls.name) || cls.name.trim();
  if (cls?.code?.trim()) return normalizeSchoolClassName(cls.code) || cls.code.trim();
  return "Class";
}

/** Class identity for sorting — ignores section suffix and code variants (8 / CLASS-8). */
function classKeyFromListItem(item: ClassListItem): string {
  const left = (item.name || "").split("·")[0]?.trim() ?? "";
  return (
    classIdentityKey(left) ||
    classIdentityKey(item.timetableGrade || "") ||
    left.toLowerCase()
  );
}

export function sectionDtoToListItem(
  section: SectionDto,
  classesById: Map<string, ClassDto>,
  enrich?: SectionEnrichment,
): ClassListItem {
  const cls = classesById.get(section.classId);
  const classLabel = classLabelForSection(section, classesById);
  const sectionCode =
    sectionIdentityKey(section.code || section.name) ||
    section.code?.trim() ||
    section.name?.trim() ||
    "—";
  const room = section.room?.trim() || "—";
  const capacity = section.capacity ?? 0;
  const students = enrich?.enrollmentCountBySection.get(section.id) ?? 0;
  const teacher = enrich?.teachersBySection.get(section.id) ?? "—";
  const subjectTeacherAssignments =
    enrich?.subjectTeacherBySection.get(section.id) ?? {};

  return {
    id: section.id,
    name: `${classLabel} · Sec ${sectionCode}`,
    levelId: section.classId,
    timetableGrade: cls?.code?.trim() || classLabel,
    section: sectionCode,
    teacher,
    students,
    capacity,
    room,
    hasTimetable: Object.keys(subjectTeacherAssignments).length > 0,
    subjectTeacherAssignments,
  };
}

/**
 * Class number → section letter (A, B, C…).
 * Duplicate Class 8 rows (different codes/ids) stay interleaved by section.
 */
export function compareClassListItems(a: ClassListItem, b: ClassListItem): number {
  const keyA = classKeyFromListItem(a);
  const keyB = classKeyFromListItem(b);
  const rankA = classSortRank(keyA);
  const rankB = classSortRank(keyB);
  if (rankA !== rankB) return rankA - rankB;

  const identityCmp = collator.compare(keyA, keyB);
  if (identityCmp !== 0) return identityCmp;

  const sectionCmp = sectionSortRank(a.section) - sectionSortRank(b.section);
  if (sectionCmp !== 0) return sectionCmp;
  return collator.compare(
    sectionIdentityKey(a.section) || a.section,
    sectionIdentityKey(b.section) || b.section,
  );
}

export function sortClassListItems(items: ClassListItem[]): ClassListItem[] {
  return [...items].sort(compareClassListItems);
}

function compareSectionsForList(
  a: SectionDto,
  b: SectionDto,
  classesById: Map<string, ClassDto>,
): number {
  const classA = classesById.get(a.classId);
  const classB = classesById.get(b.classId);
  const labelA = classA?.name || classA?.code || "";
  const labelB = classB?.name || classB?.code || "";

  const rankA = classSortRank(labelA);
  const rankB = classSortRank(labelB);
  if (rankA !== rankB) return rankA - rankB;

  const keyA = classIdentityKey(labelA);
  const keyB = classIdentityKey(labelB);
  const identityCmp = collator.compare(keyA, keyB);
  if (identityCmp !== 0) return identityCmp;

  const sectionCmp =
    sectionSortRank(a.code || a.name) - sectionSortRank(b.code || b.name);
  if (sectionCmp !== 0) return sectionCmp;

  return collator.compare(
    sectionIdentityKey(a.code || a.name) || a.code || a.name || "",
    sectionIdentityKey(b.code || b.name) || b.code || b.name || "",
  );
}

export function sectionsToListItems(
  sections: SectionDto[],
  classes: ClassDto[],
  enrich?: SectionEnrichment,
): ClassListItem[] {
  if (!Array.isArray(sections)) {
    throw new TypeError("Sections API response must be an array");
  }
  if (!Array.isArray(classes)) {
    throw new TypeError("Classes API response must be an array");
  }
  const classesById = new Map(classes.map((item) => [item.id, item]));
  return [...sections]
    .sort((a, b) => compareSectionsForList(a, b, classesById))
    .map((section) => sectionDtoToListItem(section, classesById, enrich));
}

export function sectionDtoToDetailItem(
  section: SectionDto,
  cls: ClassDto,
  enrich?: SectionEnrichment,
): SectionDetailItem {
  const classesById = new Map([[cls.id, cls]]);
  const base = sectionDtoToListItem(section, classesById, enrich);
  return {
    ...base,
    instituteId: section.instituteId,
    classId: section.classId,
    classCode: cls.code?.trim() || "—",
    classStatus: cls.status,
    sectionStatus: section.status,
    academicYearId: section.academicYearId,
    updatedAt: section.updatedAt,
    classTeacherId: section.classTeacherId ?? null,
  };
}
