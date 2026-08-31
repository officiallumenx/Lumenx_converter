import type {
  DepartmentRanking,
  TeacherPerformanceDto,
  TeacherPerformanceSummary,
} from "./types";

export function computeInstituteAverage(
  rows: TeacherPerformanceDto[],
  summary?: TeacherPerformanceSummary | null,
): string {
  if (summary?.instituteAverage != null) {
    return summary.instituteAverage.toFixed(2);
  }
  const rated = rows.filter((row) => row.rating != null);
  if (rated.length === 0) return "—";
  const avg =
    rated.reduce((sum, row) => sum + (row.rating ?? 0), 0) / rated.length;
  return avg.toFixed(2);
}

export function findTopRatedTeacher(
  rows: TeacherPerformanceDto[],
): TeacherPerformanceDto | null {
  const rated = rows.filter((row) => row.rating != null);
  if (rated.length === 0) return null;
  return [...rated].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] ?? null;
}

export function computeDepartmentRankings(
  rows: TeacherPerformanceDto[],
): DepartmentRanking[] {
  const byDept = new Map<string, TeacherPerformanceDto[]>();
  for (const row of rows) {
    const dept = row.department.trim() || "Unassigned";
    const list = byDept.get(dept) ?? [];
    list.push(row);
    byDept.set(dept, list);
  }

  return [...byDept.entries()]
    .map(([department, teachers]) => {
      const rated = teachers.filter((teacher) => teacher.rating != null);
      const average =
        rated.length === 0
          ? 0
          : rated.reduce((sum, teacher) => sum + (teacher.rating ?? 0), 0) /
            rated.length;
      return {
        department,
        average: Math.round(average * 100) / 100,
        teacherCount: teachers.length,
      };
    })
    .sort((a, b) => b.average - a.average || a.department.localeCompare(b.department));
}

export function trendTone(trend: string): "success" | "danger" | "neutral" {
  if (trend.startsWith("+") && trend !== "+0.00") return "success";
  if (trend.startsWith("-")) return "danger";
  return "neutral";
}

export function formatRating(value: number | null): string {
  return value == null ? "—" : value.toFixed(2);
}

export function instituteTrendDelta(
  summary: TeacherPerformanceSummary | null | undefined,
): string | null {
  const points = summary?.monthlyTrend ?? [];
  if (points.length < 2) return null;
  const latest = points[points.length - 1]?.value;
  const prior = points[points.length - 2]?.value;
  if (latest == null || prior == null) return null;
  const delta = Math.round((latest - prior) * 100) / 100;
  const formatted = Math.abs(delta).toFixed(2);
  if (delta > 0) return `+${formatted}`;
  if (delta < 0) return `-${formatted}`;
  return "0.00";
}
