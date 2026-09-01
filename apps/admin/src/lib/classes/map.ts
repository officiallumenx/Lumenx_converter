import type { ClassDto, ClassListItem, SectionDetailItem, SectionDto } from "./types";
import type { SectionEnrichment } from "./enrich";

export function classLabelForSection(
  section: SectionDto,
  classesById: Map<string, ClassDto>,
): string {
  const cls = classesById.get(section.classId);
  if (cls?.name?.trim()) return cls.name.trim();
  if (cls?.code?.trim()) return cls.code.trim();
  return "Class";
}

export function sectionDtoToListItem(
  section: SectionDto,
  classesById: Map<string, ClassDto>,
  enrich?: SectionEnrichment,
): ClassListItem {
  const cls = classesById.get(section.classId);
  const classLabel = classLabelForSection(section, classesById);
  const sectionCode = section.code?.trim() || section.name?.trim() || "—";
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
  return sections.map((section) => sectionDtoToListItem(section, classesById, enrich));
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
  };
}
