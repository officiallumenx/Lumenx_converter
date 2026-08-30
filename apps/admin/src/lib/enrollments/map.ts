import type { EnrollmentDto, EnrollmentListItem } from "./types";

export function enrollmentDtoToListItem(dto: EnrollmentDto): EnrollmentListItem {
  return {
    id: dto.id,
    studentId: dto.studentId,
    studentName: dto.studentName,
    classId: dto.classId,
    sectionId: dto.sectionId,
    academicYearId: dto.academicYearId,
    rollNo: dto.rollNo,
    status: dto.status,
  };
}

export function enrollmentDtosToListItems(rows: EnrollmentDto[]): EnrollmentListItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Enrollments API response must be an array");
  }
  return rows.map(enrollmentDtoToListItem);
}
