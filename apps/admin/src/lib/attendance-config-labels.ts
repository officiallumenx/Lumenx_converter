import type { AttendanceConfigVersion } from "@/lib/attendance-config-store";
import { isConfigVersionActiveOnDate } from "@/lib/attendance-config-store";
import { labelsForClassSectionKeys } from "@/lib/exam-timetable-data";
import { formatMonthYear as formatMonthYearShared, todayUtcIso } from "@lumenx/utils";

export type AttendanceConfigVersionStatus = "active" | "upcoming" | "historical";

export function todayIso(now = new Date()): string {
  return todayUtcIso(now);
}

export function scopeTargetsLabel(row: AttendanceConfigVersion): string {
  if (row.scope === "institute") return "All classes & sections";
  if (row.scope === "class") {
    return row.classTargets.length ? row.classTargets.join(", ") : "—";
  }
  return row.sectionTargets.length
    ? labelsForClassSectionKeys(row.sectionTargets).join(", ")
    : "—";
}

export function statusForVersion(
  row: AttendanceConfigVersion,
  today: string,
): AttendanceConfigVersionStatus {
  if (row.effectiveFrom > today) return "upcoming";
  if (isConfigVersionActiveOnDate(row, today)) return "active";
  return "historical";
}

export function formatMonthYear(iso: string): string {
  return formatMonthYearShared(iso);
}

export function applicabilityLabel(appliesFrom: string, appliesTo: string | null): string {
  if (!appliesTo) {
    return `From ${formatMonthYear(appliesFrom)} onwards`;
  }
  return `${formatMonthYear(appliesFrom)} → ${formatMonthYear(appliesTo)}`;
}
