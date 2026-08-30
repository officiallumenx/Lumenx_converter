import type { TeacherListItem } from "@/lib/teachers/types";
import type {
  StaffAttendanceDaySummary,
  StaffAttendanceDto,
  StaffAttendanceMarkItem,
} from "./types";

function shortRef(id: string, prefix: string): string {
  const token = id?.trim().slice(0, 8) || "—";
  return `${prefix} · ${token}`;
}

function formatTime(value: string | null): string | null {
  if (!value) return null;
  return value.length >= 5 ? value.slice(0, 5) : value;
}

export function staffAttendanceDtoToMarkItem(
  dto: StaffAttendanceDto,
  teachersById: Map<string, TeacherListItem>,
): StaffAttendanceMarkItem {
  const teacher = teachersById.get(dto.teacherId);
  return {
    id: dto.id,
    teacherId: dto.teacherId,
    teacherName: teacher?.name ?? shortRef(dto.teacherId, "Teacher"),
    status: dto.status,
    checkIn: formatTime(dto.checkIn),
    checkOut: formatTime(dto.checkOut),
    note: dto.note,
    dayStatus: dto.dayStatus,
  };
}

export function staffAttendanceDtosToDaySummary(
  rows: StaffAttendanceDto[],
  teachersById: Map<string, TeacherListItem>,
  date: string,
): StaffAttendanceDaySummary {
  if (!Array.isArray(rows)) {
    throw new TypeError("Staff attendance API response must be an array");
  }
  const marks = rows.map((dto) => staffAttendanceDtoToMarkItem(dto, teachersById));
  const dayStatus = marks.some((mark) => mark.dayStatus === "submitted")
    ? "submitted"
    : "draft";
  return {
    date,
    dayStatus,
    total: marks.length,
    present: marks.filter((m) => m.status === "present").length,
    late: marks.filter((m) => m.status === "late").length,
    absent: marks.filter((m) => m.status === "absent").length,
    leave: marks.filter((m) => m.status === "leave").length,
    halfDay: marks.filter((m) => m.status === "half-day").length,
    marks,
  };
}

/**
 * Fills missing teachers as draft "absent" placeholders so Admin can mark a full day.
 */
export function mergeTeachersIntoDaySummary(
  summary: StaffAttendanceDaySummary,
  teachers: TeacherListItem[],
): StaffAttendanceDaySummary {
  const byTeacher = new Map(summary.marks.map((mark) => [mark.teacherId, mark]));
  const marks: StaffAttendanceMarkItem[] = teachers.map((teacher) => {
    const existing = byTeacher.get(teacher.id);
    if (existing) return existing;
    return {
      id: `pending:${teacher.id}`,
      teacherId: teacher.id,
      teacherName: teacher.name,
      status: "absent",
      checkIn: null,
      checkOut: null,
      note: null,
      dayStatus: summary.dayStatus,
    };
  });
  for (const mark of summary.marks) {
    if (!teachers.some((teacher) => teacher.id === mark.teacherId)) {
      marks.push(mark);
    }
  }
  return {
    ...summary,
    total: marks.length,
    present: marks.filter((m) => m.status === "present").length,
    late: marks.filter((m) => m.status === "late").length,
    absent: marks.filter((m) => m.status === "absent").length,
    leave: marks.filter((m) => m.status === "leave").length,
    halfDay: marks.filter((m) => m.status === "half-day").length,
    marks,
  };
}
