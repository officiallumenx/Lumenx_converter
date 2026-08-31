import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { listTeachersForActor } from "../teachers/service.js";
import { STUDENT_STAFF_READ_ROLES } from "../students/service.js";
import {
  aggregateInstituteAverage,
  aggregateMonthlyInstituteAverages,
  aggregateTeacherWindows,
  buildPerformanceDateRanges,
  fetchTeacherPerformanceFacts,
} from "./repository.js";
import {
  computeOperationalScore,
  formatPerformanceTrend,
  subtractDays,
  toIsoDate,
} from "./score.js";
import type {
  TeacherPerformanceDto,
  TeacherPerformanceListResult,
  TeacherPerformanceMetrics,
} from "./types.js";
import type { TeacherOperationalCounts } from "./score.js";

function assertPerformanceReader(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...STUDENT_STAFF_READ_ROLES]);
}

function toMetrics(counts: TeacherOperationalCounts): TeacherPerformanceMetrics {
  return {
    staffAttendanceRate:
      counts.staffTotal > 0
        ? Math.round((counts.staffPresent / counts.staffTotal) * 100) / 100
        : null,
    publishedMarks: counts.publishedMarks,
    publishedHomework: counts.publishedHomework,
    submittedDiaryDays: counts.submittedDiaryDays,
    submittedAttendanceRegisters: counts.submittedAttendanceRegisters,
  };
}

function assignRanks(
  rows: TeacherPerformanceDto[],
): TeacherPerformanceDto[] {
  const rated = [...rows]
    .filter((row) => row.rating != null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name));

  const rankByTeacher = new Map<string, number>();
  rated.forEach((row, index) => {
    rankByTeacher.set(row.teacherId, index + 1);
  });

  return rows
    .map((row) => ({
      ...row,
      rank: rankByTeacher.get(row.teacherId) ?? null,
    }))
    .sort((a, b) => {
      if (a.rank == null && b.rank == null) return a.name.localeCompare(b.name);
      if (a.rank == null) return 1;
      if (b.rank == null) return -1;
      return a.rank - b.rank || a.name.localeCompare(b.name);
    });
}

export async function listTeacherPerformanceForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
  asOf: Date = new Date(),
): Promise<TeacherPerformanceListResult> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertPerformanceReader(actor, instituteId);

  const teachers = await listTeachersForActor(admin, actor, { instituteId });
  const teacherIds = teachers.map((teacher) => teacher.id);
  const ranges = buildPerformanceDateRanges(asOf);
  const chartFrom = toIsoDate(subtractDays(asOf, 180));

  const facts = await fetchTeacherPerformanceFacts(
    admin,
    instituteId,
    chartFrom,
    ranges.asOfDate,
  );
  const windows = aggregateTeacherWindows(facts, teacherIds, ranges);

  const rows: TeacherPerformanceDto[] = teachers.map((teacher) => {
    const windowCounts = windows.get(teacher.id)!;
    const rating = computeOperationalScore(windowCounts.ratingWindow);
    const recentRating = computeOperationalScore(windowCounts.recentWindow);
    const priorRating = computeOperationalScore(windowCounts.priorWindow);
    const hasData = rating != null;

    return {
      teacherId: teacher.id,
      name: teacher.displayName,
      department: teacher.department?.trim() || "Unassigned",
      rating,
      trend: formatPerformanceTrend(recentRating, priorRating),
      rank: null,
      metrics: toMetrics(windowCounts.ratingWindow),
      ratingSource: hasData ? "operational" : "insufficient_data",
    };
  });

  const ranked = assignRanks(rows);
  const ratings = ranked.map((row) => row.rating);
  const monthlyTrend = aggregateMonthlyInstituteAverages(facts, teacherIds, 7, asOf);

  return {
    teachers: ranked,
    summary: {
      instituteAverage: aggregateInstituteAverage(ratings),
      monthlyTrend,
      ratedCount: ratings.filter((value) => value != null).length,
      facultyCount: teachers.length,
    },
  };
}

/** Back-compat alias used by legacy callers expecting only teacher rows. */
export async function listTeacherPerformanceRowsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<TeacherPerformanceDto[]> {
  const result = await listTeacherPerformanceForActor(admin, actor, instituteIdRaw);
  return result.teachers;
}
