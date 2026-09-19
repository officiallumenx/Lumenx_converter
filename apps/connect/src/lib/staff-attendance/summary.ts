import type { StaffAttendanceDto, TeacherSelfAttendanceSummary } from "./types";

/** Default lookback for teacher "My attendance" (matches Admin overview). */
export function defaultStaffAttendanceRangeFrom(daysBack = 90): string {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

function formatTime(value: string | null): string {
  if (!value) return "—";
  return value.length >= 5 ? value.slice(0, 5) : value;
}

/**
 * Attendance % from submitted days only:
 * (present + late + half-day) / submitted days × 100.
 */
export function buildTeacherSelfAttendanceSummary(
  rows: StaffAttendanceDto[],
): TeacherSelfAttendanceSummary {
  const records = [...rows].sort((a, b) =>
    b.attendanceDate.localeCompare(a.attendanceDate),
  );
  const submitted = records.filter((r) => r.dayStatus === "submitted");

  let present = 0;
  let late = 0;
  let half = 0;
  let leave = 0;
  let absent = 0;

  for (const row of submitted) {
    if (row.status === "present") present += 1;
    else if (row.status === "late") late += 1;
    else if (row.status === "half-day") half += 1;
    else if (row.status === "leave") leave += 1;
    else absent += 1;
  }

  const days = submitted.length;
  const attended = present + late + half;

  return {
    days,
    present,
    late,
    half,
    leave,
    absent,
    attendancePct: days === 0 ? 0 : Math.round((attended / days) * 100),
    submitted,
    records,
  };
}

export function formatStaffCheckTime(value: string | null): string {
  return formatTime(value);
}
