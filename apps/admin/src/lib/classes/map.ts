import type { ClassDto, ClassListItem, SectionDetailItem, SectionDto } from "./types";

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
): ClassListItem {
  const cls = classesById.get(section.classId);
  const classLabel = classLabelForSection(section, classesById);
  const sectionCode = section.code?.trim() || section.name?.trim() || "—";
  const room = section.room?.trim() || "—";
  const capacity = section.capacity ?? 0;

  return {
    id: section.id,
    name: `${classLabel} · Sec ${sectionCode}`,
    levelId: section.classId,
    timetableGrade: cls?.code?.trim() || classLabel,
    section: sectionCode,
    teacher: "—",
    students: 0,
    capacity,
    room,
    hasTimetable: false,
    subjectTeacherAssignments: {},
  };
}

export function sectionsToListItems(
  sections: SectionDto[],
  classes: ClassDto[],
): ClassListItem[] {
  if (!Array.isArray(sections)) {
    throw new TypeError("Sections API response must be an array");
  }
  if (!Array.isArray(classes)) {
    throw new TypeError("Classes API response must be an array");
  }
  const classesById = new Map(classes.map((item) => [item.id, item]));
  return sections.map((section) => sectionDtoToListItem(section, classesById));
}

export function sectionDtoToDetailItem(
  section: SectionDto,
  cls: ClassDto,
): SectionDetailItem {
  const classesById = new Map([[cls.id, cls]]);
  const base = sectionDtoToListItem(section, classesById);
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
