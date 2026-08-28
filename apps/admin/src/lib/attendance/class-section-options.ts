import { classLabelForSection } from "@/lib/classes/map";
import type { ClassDto, SectionDto } from "@/lib/classes/types";
import type {
  StudentAttendanceClassOption,
  StudentAttendanceSectionOption,
} from "@/components/student-attendance/types";

export function buildStudentAttendanceApiClassOptions(
  classes: ClassDto[],
): StudentAttendanceClassOption[] {
  return [...classes]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((cls) => ({ id: cls.id, label: cls.name.trim() || cls.code.trim() || cls.id }));
}

export function buildStudentAttendanceApiSectionOptions(
  classId: string,
  sections: SectionDto[],
  classesById: Map<string, ClassDto>,
): StudentAttendanceSectionOption[] {
  if (!classId) return [];
  return sections
    .filter((section) => section.classId === classId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((section) => ({
      id: section.id,
      classId,
      label: `${classLabelForSection(section, classesById)} · Sec ${section.code?.trim() || section.name}`,
    }));
}
