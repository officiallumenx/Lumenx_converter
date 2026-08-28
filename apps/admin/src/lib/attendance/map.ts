import type { StudentListItem } from "@/lib/students/types";
import type {
  AttendanceMarkDto,
  AttendanceMarkListItem,
  AttendanceRegisterDetail,
  AttendanceRegisterDto,
  AttendanceRegisterListItem,
} from "./types";

function countByStatus(marks: AttendanceMarkDto[] | undefined, status: string): number {
  return marks?.filter((mark) => mark.status === status).length ?? 0;
}

export function attendanceRegisterDtoToListItem(
  dto: AttendanceRegisterDto,
): AttendanceRegisterListItem {
  const marks = dto.marks ?? [];
  return {
    id: dto.id,
    sectionId: dto.sectionId,
    classId: dto.classId,
    attendanceDate: dto.attendanceDate,
    slotLabel: dto.slotLabel,
    subjectLabel: dto.subjectLabel,
    status: dto.status,
    method: dto.method,
    owner: dto.owner,
    presentCount: countByStatus(marks, "present"),
    absentCount: countByStatus(marks, "absent"),
    leaveCount: countByStatus(marks, "leave"),
    totalMarks: marks.length,
  };
}

export function attendanceRegisterDtosToListItems(
  rows: AttendanceRegisterDto[],
): AttendanceRegisterListItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Attendance registers API response must be an array");
  }
  return rows.map(attendanceRegisterDtoToListItem);
}

export function attendanceRegisterDtoToDetail(
  dto: AttendanceRegisterDto,
  studentsById: Map<string, StudentListItem>,
): AttendanceRegisterDetail {
  const base = attendanceRegisterDtoToListItem(dto);
  const marks: AttendanceMarkListItem[] = (dto.marks ?? []).map((mark) => {
    const student = studentsById.get(mark.studentId);
    return {
      id: mark.id,
      studentId: mark.studentId,
      studentName: student?.name ?? shortRef(mark.studentId, "Student"),
      enrollmentId: mark.enrollmentId,
      status: mark.status,
    };
  });
  return { ...base, marks };
}

function shortRef(id: string, prefix: string): string {
  const token = id?.trim().slice(0, 8) || "—";
  return `${prefix} · ${token}`;
}
