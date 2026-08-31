import type { TeacherListItem } from "@/lib/teachers/types";
import type { StaffAttendanceDto, StaffAttendanceMarkItem, StaffAttendanceStatus } from "./types";
import { staffAttendanceDtoToMarkItem } from "./map";

export type StaffAttendanceExceptionDay = {
  date: string;
  status: Exclude<StaffAttendanceStatus, "present">;
  note: string | null;
};

export type StaffAttendanceOverviewRow = {
  id: string;
  name: string;
  dept: string;
  days: number;
  present: number;
  late: number;
  half: number;
  leave: number;
  absent: number;
  attendancePct: number;
  exceptions: StaffAttendanceExceptionDay[];
};

export type StaffAttendanceHistoryDay = {
  date: string;
  submittedAt: string | null;
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  leave: number;
  total: number;
  marks: StaffAttendanceMarkItem[];
};

function isSubmittedRow(row: StaffAttendanceDto): boolean {
  return row.dayStatus === "submitted";
}

export function buildStaffAttendanceOverview(
  rows: StaffAttendanceDto[],
  teachersById: Map<string, TeacherListItem>,
): StaffAttendanceOverviewRow[] {
  const submitted = rows.filter(isSubmittedRow);
  const byId = new Map<string, StaffAttendanceOverviewRow>();

  for (const dto of submitted) {
    const teacher = teachersById.get(dto.teacherId);
    let row = byId.get(dto.teacherId);
    if (!row) {
      row = {
        id: dto.teacherId,
        name: teacher?.name ?? dto.teacherId.slice(0, 8),
        dept: teacher?.dept ?? "—",
        days: 0,
        present: 0,
        late: 0,
        half: 0,
        leave: 0,
        absent: 0,
        attendancePct: 0,
        exceptions: [],
      };
      byId.set(dto.teacherId, row);
    }

    row.days += 1;
    if (dto.status === "present") {
      row.present += 1;
    } else if (dto.status === "late") {
      row.late += 1;
      row.exceptions.push({
        date: dto.attendanceDate,
        status: "late",
        note: dto.note,
      });
    } else if (dto.status === "half-day") {
      row.half += 1;
      row.exceptions.push({
        date: dto.attendanceDate,
        status: "half-day",
        note: dto.note,
      });
    } else if (dto.status === "leave") {
      row.leave += 1;
      row.exceptions.push({
        date: dto.attendanceDate,
        status: "leave",
        note: dto.note,
      });
    } else {
      row.absent += 1;
      row.exceptions.push({
        date: dto.attendanceDate,
        status: "absent",
        note: dto.note,
      });
    }
  }

  return [...byId.values()]
    .map((row) => {
      const attended = row.present + row.late + row.half;
      return {
        ...row,
        attendancePct: row.days === 0 ? 0 : Math.round((attended / row.days) * 100),
        exceptions: [...row.exceptions].sort((a, b) => b.date.localeCompare(a.date)),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function buildStaffAttendanceHistoryDays(
  rows: StaffAttendanceDto[],
  teachersById: Map<string, TeacherListItem>,
): StaffAttendanceHistoryDay[] {
  const submitted = rows.filter(isSubmittedRow);
  const byDate = new Map<string, StaffAttendanceDto[]>();

  for (const row of submitted) {
    const bucket = byDate.get(row.attendanceDate) ?? [];
    bucket.push(row);
    byDate.set(row.attendanceDate, bucket);
  }

  return [...byDate.entries()]
    .map(([date, dayRows]) => {
      const marks = dayRows.map((dto) => staffAttendanceDtoToMarkItem(dto, teachersById));
      const submittedAt =
        dayRows.find((row) => row.submittedAt)?.submittedAt ?? null;
      return {
        date,
        submittedAt,
        present: marks.filter((m) => m.status === "present").length,
        late: marks.filter((m) => m.status === "late").length,
        halfDay: marks.filter((m) => m.status === "half-day").length,
        absent: marks.filter((m) => m.status === "absent").length,
        leave: marks.filter((m) => m.status === "leave").length,
        total: marks.length,
        marks,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function defaultStaffAttendanceRangeFrom(daysBack = 90): string {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().slice(0, 10);
}
