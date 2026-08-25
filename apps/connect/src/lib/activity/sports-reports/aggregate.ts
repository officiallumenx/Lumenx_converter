import { listAchievementsFromStore } from "../achievements/store";
import { listCertificatesFromStore } from "../certificates/store";
import { computeCoachNoteSummary } from "../sports/coach-notes-summary";
import { computeAttendanceSummary } from "../sports/sports-attendance-summary";
import { listActivitiesFromStore } from "../sports/activities-store";
import { listCoachNotesFromStore } from "../sports/coach-notes-store";
import { listMatchResultsFromStore } from "../sports/match-results-store";
import { listPracticeSessionsFromStore } from "../sports/practice-sessions-store";
import { sportsRepository } from "../sports/repositories";
import { listAttendanceFromStore } from "../sports/sports-attendance-store";
import { listTournamentsFromStore } from "../sports/tournaments-store";
import type { SportType } from "../sports/types";
import { SPORT_TYPE_LABELS } from "../sports/types";
import { ACHIEVEMENT_TYPE_LABELS } from "../achievements/types";
import type {
  SportsModuleReportSummary,
  SportsMvpStatistic,
  SportsReportChartPoint,
  SportsReportKpi,
  SportsReportsFilters,
  SportsReportsSnapshot,
  SportsTeamRanking,
} from "./types";
import { SPORTS_REPORT_MODULE_LABELS } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function inDateRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

function filterTeams(filters: SportsReportsFilters) {
  return sportsRepository.getTeamsSnapshot().filter((t) => {
    if (filters.academicYear !== "all" && t.academicYear !== filters.academicYear) return false;
    if (filters.sportType !== "all" && t.sportType !== filters.sportType) return false;
    if (filters.teamId !== "all" && t.id !== filters.teamId) return false;
    if (filters.coach !== "all" && t.coach !== filters.coach) return false;
    return true;
  });
}

function teamIds(filters: SportsReportsFilters): Set<string> | null {
  if (filters.teamId !== "all") return new Set([filters.teamId]);
  const teams = filterTeams(filters);
  if (filters.sportType !== "all" || filters.coach !== "all" || filters.academicYear !== "all") {
    return new Set(teams.map((t) => t.id));
  }
  return null;
}

function matchesTeam(refs: string[] | undefined, ids: Set<string> | null): boolean {
  if (!ids) return true;
  if (!refs?.length) return false;
  return refs.some((id) => ids.has(id));
}

export function buildDefaultFilters(): SportsReportsFilters {
  const today = new Date();
  const from = new Date(today);
  from.setMonth(from.getMonth() - 5);
  return {
    academicYear: "2025–26",
    sportType: "all",
    teamId: "all",
    coach: "all",
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: today.toISOString().slice(0, 10),
  };
}

export function listCoachFilterOptions(): string[] {
  const coaches = new Set<string>();
  sportsRepository.getTeamsSnapshot().forEach((t) => coaches.add(t.coach));
  listPracticeSessionsFromStore().forEach((s) => coaches.add(s.coach));
  listCoachNotesFromStore().forEach((n) => coaches.add(n.coach));
  return [...coaches].sort();
}

export function listTeamFilterOptions(): { id: string; name: string }[] {
  return sportsRepository.listActiveTeamOptions();
}

export function buildSportsReportsSnapshot(filters: SportsReportsFilters): SportsReportsSnapshot {
  const ids = teamIds(filters);
  const teams = filterTeams(filters);

  const activities = listActivitiesFromStore().filter((a) => {
    if (filters.sportType !== "all" && a.sportType !== filters.sportType) return false;
    if (!inDateRange(a.date, filters.dateFrom, filters.dateTo)) return false;
    if (!matchesTeam(a.linkedTeamIds, ids)) return false;
    if (filters.coach !== "all" && a.coordinators.coach !== filters.coach) return false;
    return true;
  });

  const practice = listPracticeSessionsFromStore().filter((s) => {
    if (!inDateRange(s.date, filters.dateFrom, filters.dateTo)) return false;
    if (!matchesTeam([s.teamId], ids)) return false;
    if (filters.coach !== "all" && s.coach !== filters.coach) return false;
    if (filters.sportType !== "all") {
      const linked = sportsRepository.getTeamsSnapshot().filter((t) => t.id === s.teamId);
      if (!linked.some((t) => t.sportType === filters.sportType)) return false;
    }
    return true;
  });

  const attendance = listAttendanceFromStore().filter((r) => {
    if (!inDateRange(r.sessionDate, filters.dateFrom, filters.dateTo)) return false;
    if (filters.teamId !== "all" && r.teamId !== filters.teamId) return false;
    if (filters.coach !== "all") {
      const session = listPracticeSessionsFromStore().find((s) => s.id === r.practiceSessionId);
      if (session?.coach !== filters.coach) return false;
    }
    if (filters.sportType !== "all") {
      const team = sportsRepository.getTeamsSnapshot().find((t) => t.id === r.teamId);
      if (team?.sportType !== filters.sportType) return false;
    }
    return true;
  });

  const coachNotes = listCoachNotesFromStore().filter((n) => {
    if (!inDateRange(n.sessionDate, filters.dateFrom, filters.dateTo)) return false;
    if (filters.teamId !== "all" && n.teamId !== filters.teamId) return false;
    if (filters.coach !== "all" && n.coach !== filters.coach) return false;
    return true;
  });

  const tournaments = listTournamentsFromStore().filter((t) => {
    if (filters.academicYear !== "all" && t.academicYear !== filters.academicYear) return false;
    if (filters.sportType !== "all" && t.sportType !== filters.sportType) return false;
    if (filters.coach !== "all" && t.organizer !== filters.coach) return false;
    return t.endDate >= filters.dateFrom && t.startDate <= filters.dateTo;
  });

  const matchResults = listMatchResultsFromStore().filter((r) => {
    if (!inDateRange(r.matchDate, filters.dateFrom, filters.dateTo)) return false;
    if (filters.sportType !== "all" && r.sportType !== filters.sportType) return false;
    if (filters.teamId !== "all") {
      const involves =
        r.winnerId === filters.teamId || r.runnerUpId === filters.teamId;
      if (!involves) return false;
    }
    return true;
  });

  const achievements = listAchievementsFromStore({
    sourceModule: "sports",
  }).filter((a) => {
    if (!inDateRange(a.date, filters.dateFrom, filters.dateTo)) return false;
    if (filters.teamId !== "all" && a.teamId !== filters.teamId) return false;
    return true;
  });

  const certificates = listCertificatesFromStore().filter((c) => {
    if (c.achievementRef.sourceModule !== "sports") return false;
    if (!inDateRange(c.issueDate, filters.dateFrom, filters.dateTo)) return false;
    if (filters.teamId !== "all" && c.teamId !== filters.teamId) return false;
    return true;
  });

  const attSummary = computeAttendanceSummary(attendance);
  const coachSummary = computeCoachNoteSummary(coachNotes);

  const moduleSummaries: SportsModuleReportSummary[] = [
    summary("teams", teams.length, teams.filter((t) => t.status === "active").length, 8),
    summary("activities", activities.length, activities.filter((a) => a.status === "scheduled" || a.status === "in_progress").length, 12),
    summary("practice", practice.length, practice.filter((s) => s.status === "scheduled").length, 6),
    summary("attendance", attendance.length, attSummary.present + attSummary.late, attSummary.attendancePercentage),
    summary("coach_performance", coachNotes.length, coachSummary.excellent + coachSummary.good, 5),
    summary("tournaments", tournaments.length, tournaments.filter((t) => t.status === "ongoing" || t.status === "scheduled").length, 10),
    summary("match_results", matchResults.length, matchResults.filter((r) => r.matchStatus === "completed").length, 15),
    summary("achievements", achievements.length, achievements.filter((a) => a.awardedAt).length, 18),
    summary("certificates", certificates.length, certificates.filter((c) => c.status === "issued").length, 22),
  ];

  const kpis: SportsReportKpi[] = [
    { id: "participation", label: "Total participation", value: String(attendance.length + practice.length), hint: "Attendance + practice records", changePct: 12 },
    { id: "attendance_pct", label: "Attendance rate", value: `${attSummary.attendancePercentage}%`, hint: "Present + late", changePct: 4 },
    { id: "teams", label: "Active teams", value: String(teams.filter((t) => t.status === "active").length), hint: "In scope", changePct: 0 },
    { id: "matches", label: "Match results", value: String(matchResults.length), hint: "In date range", changePct: 8 },
    { id: "achievements", label: "Achievements", value: String(achievements.length), hint: "Sports module", changePct: 18 },
    { id: "certificates", label: "Certificates issued", value: String(certificates.filter((c) => c.status === "issued").length), hint: "From achievements", changePct: 22 },
  ];

  const monthlyGrowth = buildMonthlySeries(filters, (month) => {
    const m = month.padStart(2, "0");
    const practiceCount = practice.filter((s) => s.date.slice(5, 7) === m).length;
    const attCount = attendance.filter((r) => r.sessionDate.slice(5, 7) === m).length;
    return practiceCount + attCount;
  });

  const participationTrend = monthlyGrowth.map((p, i) => ({
    label: p.label,
    value: p.value,
    value2: Math.round(p.value * 0.85 + i * 2),
  }));

  const attendanceTrend = buildMonthlySeries(filters, (month) => {
    const m = month.padStart(2, "0");
    const monthRecords = attendance.filter((r) => r.sessionDate.slice(5, 7) === m);
    if (monthRecords.length === 0) return 0;
    return computeAttendanceSummary(monthRecords).attendancePercentage;
  });

  const sportComparison = buildSportComparison(teams, matchResults, achievements);

  const teamRankings = buildTeamRankings(teams, attendance);

  const mvpStatistics = buildMvpStats(matchResults, achievements);

  const coachPerformance = buildCoachPerformance(coachNotes);

  const tournamentActivity = tournaments.slice(0, 6).map((t) => ({
    label: t.name.length > 18 ? `${t.name.slice(0, 16)}…` : t.name,
    value: t.matches.length,
  }));

  const matchResultsTrend = buildMonthlySeries(filters, (month) => {
    const m = month.padStart(2, "0");
    return matchResults.filter((r) => r.matchDate.slice(5, 7) === m).length;
  });

  const achievementsByType = aggregateByKey(
    achievements,
    (a) => ACHIEVEMENT_TYPE_LABELS[a.achievementType],
  );

  const certificatesTrend = buildMonthlySeries(filters, (month) => {
    const m = month.padStart(2, "0");
    return certificates.filter((c) => c.issueDate.slice(5, 7) === m).length;
  });

  return {
    generatedAt: new Date().toISOString(),
    filters,
    kpis,
    moduleSummaries,
    monthlyGrowth,
    participationTrend,
    attendanceTrend,
    sportComparison,
    teamRankings,
    mvpStatistics,
    coachPerformance,
    tournamentActivity,
    matchResultsTrend,
    achievementsByType,
    certificatesTrend,
  };
}

function summary(
  module: SportsModuleReportSummary["module"],
  total: number,
  active: number,
  trendPct: number,
): SportsModuleReportSummary {
  return {
    module,
    label: SPORTS_REPORT_MODULE_LABELS[module],
    total,
    active,
    trendPct,
  };
}

function buildMonthlySeries(
  filters: SportsReportsFilters,
  compute: (month: string) => number,
): SportsReportChartPoint[] {
  const from = new Date(filters.dateFrom);
  const to = new Date(filters.dateTo);
  const points: SportsReportChartPoint[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to) {
    const month = String(cursor.getMonth() + 1);
    points.push({
      label: MONTHS[cursor.getMonth()],
      value: compute(month),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return points.slice(-6);
}

function buildSportComparison(
  teams: ReturnType<typeof filterTeams>,
  matchResults: ReturnType<typeof listMatchResultsFromStore>,
  achievements: ReturnType<typeof listAchievementsFromStore>,
): SportsReportChartPoint[] {
  const sports = new Map<SportType, number>();
  teams.forEach((t) => sports.set(t.sportType, (sports.get(t.sportType) ?? 0) + t.stats.activeMembers));
  matchResults.forEach((r) => sports.set(r.sportType, (sports.get(r.sportType) ?? 0) + 2));
  achievements.forEach(() => {
    /* weight via teams already */
  });
  return [...sports.entries()]
    .map(([sport, value]) => ({ label: SPORT_TYPE_LABELS[sport], value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function buildTeamRankings(
  teams: ReturnType<typeof filterTeams>,
  attendance: ReturnType<typeof listAttendanceFromStore>,
): SportsTeamRanking[] {
  return [...teams]
    .map((t) => {
      const teamAtt = attendance.filter((r) => r.teamId === t.id);
      const attPct =
        teamAtt.length > 0 ? computeAttendanceSummary(teamAtt).attendancePercentage : t.stats.practiceSessions > 0 ? 78 : 0;
      const score = t.stats.wins * 10 + t.stats.achievements * 5 + attPct * 0.5;
      return {
        rank: 0,
        teamId: t.id,
        teamName: t.name,
        sportType: t.sportType,
        score: Math.round(score),
        wins: t.stats.wins,
        attendancePct: attPct,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }))
    .slice(0, 8);
}

function buildMvpStats(
  matchResults: ReturnType<typeof listMatchResultsFromStore>,
  achievements: ReturnType<typeof listAchievementsFromStore>,
): SportsMvpStatistic[] {
  const counts = new Map<string, SportsMvpStatistic>();
  const add = (name: string, team: string, category: string) => {
    const key = `${name}-${category}`;
    const prev = counts.get(key);
    if (prev) {
      prev.count += 1;
      counts.set(key, prev);
    } else {
      counts.set(key, { studentName: name, teamName: team, count: 1, category });
    }
  };
  matchResults.forEach((r) => {
    if (r.awards.mvp) add(r.awards.mvp, r.winnerName ?? "—", "MVP");
    if (r.awards.bestPerformer) add(r.awards.bestPerformer, r.winnerName ?? "—", "Best Performer");
    if (r.highlights.highestScorer) add(r.highlights.highestScorer.split("(")[0].trim(), r.winnerName ?? "—", "Highest Scorer");
  });
  achievements
    .filter((a) => a.achievementType === "mvp")
    .forEach((a) => add(a.studentName, a.teamName ?? "—", "Achievement MVP"));
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6);
}

function buildCoachPerformance(
  notes: ReturnType<typeof listCoachNotesFromStore>,
): SportsReportChartPoint[] {
  const byCoach = new Map<string, { total: number; score: number }>();
  notes.forEach((n) => {
    const ratingScore =
      n.performanceRating === "excellent"
        ? 4
        : n.performanceRating === "good"
          ? 3
          : n.performanceRating === "average"
            ? 2
            : 1;
    const prev = byCoach.get(n.coach) ?? { total: 0, score: 0 };
    byCoach.set(n.coach, { total: prev.total + 1, score: prev.score + ratingScore });
  });
  return [...byCoach.entries()]
    .map(([coach, data]) => ({
      label: coach.split(" ")[0],
      value: Math.round((data.score / data.total) * 25),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function aggregateByKey<T>(items: T[], keyFn: (item: T) => string): SportsReportChartPoint[] {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const k = keyFn(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  return [...map.entries()].map(([label, value]) => ({ label, value }));
}
