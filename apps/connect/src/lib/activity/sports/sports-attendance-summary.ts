import type { SportsAttendanceRecord, SportsAttendanceSummary } from "./sports-attendance-types";

export function computeAttendanceSummary(
  records: SportsAttendanceRecord[],
): SportsAttendanceSummary {
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const late = records.filter((r) => r.status === "late").length;
  const excused = records.filter((r) => r.status === "excused").length;
  const total = records.length;
  const attended = present + late;
  const attendancePercentage = total > 0 ? Math.round((attended / total) * 100) : 0;

  return { present, absent, late, excused, total, attendancePercentage };
}
