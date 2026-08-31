import type { ClassDto, SectionDto } from "@/lib/classes/types";
import type { EnrollmentDto, EnrollmentListItem } from "./types";

export function enrollmentDtoToListItem(
  dto: EnrollmentDto,
  labels?: { classLabel?: string; sectionLabel?: string },
): EnrollmentListItem {
  return {
    id: dto.id,
    studentId: dto.studentId,
    studentName: dto.studentName,
    classId: dto.classId,
    sectionId: dto.sectionId,
    academicYearId: dto.academicYearId,
    classLabel: labels?.classLabel ?? "—",
    sectionLabel: labels?.sectionLabel ?? "—",
    rollNo: dto.rollNo,
    status: dto.status,
    enrolledOn: dto.enrolledOn,
    withdrawnOn: dto.withdrawnOn,
  };
}

export function enrollmentDtosToListItems(
  rows: EnrollmentDto[],
  catalog?: {
    classesById?: Map<string, ClassDto>;
    sectionsById?: Map<string, SectionDto>;
  },
): EnrollmentListItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Enrollments API response must be an array");
  }
  return rows.map((dto) => {
    const section = catalog?.sectionsById?.get(dto.sectionId);
    const cls =
      catalog?.classesById?.get(dto.classId) ??
      (section ? catalog?.classesById?.get(section.classId) : undefined);
    return enrollmentDtoToListItem(dto, {
      classLabel: cls?.name?.trim() || cls?.code?.trim() || "—",
      sectionLabel: section?.code?.trim() || section?.name?.trim() || "—",
    });
  });
}
