import type { SportType } from "../sports/types";

export type SportsReportModuleId =
  | "teams"
  | "activities"
  | "practice"
  | "attendance"
  | "coach_performance"
  | "tournaments"
  | "match_results"
  | "achievements"
  | "certificates";

export interface SportsReportsFilters {
  academicYear: string | "all";
  sportType: SportType | "all";
  teamId: string | "all";
  coach: string | "all";
  dateFrom: string;
  dateTo: string;
}

export interface SportsReportKpi {
  id: string;
  label: string;
  value: string;
  hint?: string;
  changePct?: number;
}

export interface SportsReportChartPoint {
  label: string;
  value: number;
  value2?: number;
}

export interface SportsTeamRanking {
  rank: number;
  teamId: string;
  teamName: string;
  sportType: SportType;
  score: number;
  wins: number;
  attendancePct: number;
}

export interface SportsMvpStatistic {
  studentName: string;
  teamName: string;
  count: number;
  category: string;
}

export interface SportsModuleReportSummary {
  module: SportsReportModuleId;
  label: string;
  total: number;
  active: number;
  trendPct: number;
}

export interface SportsReportsSnapshot {
  generatedAt: string;
  filters: SportsReportsFilters;
  kpis: SportsReportKpi[];
  moduleSummaries: SportsModuleReportSummary[];
  monthlyGrowth: SportsReportChartPoint[];
  participationTrend: SportsReportChartPoint[];
  attendanceTrend: SportsReportChartPoint[];
  sportComparison: SportsReportChartPoint[];
  teamRankings: SportsTeamRanking[];
  mvpStatistics: SportsMvpStatistic[];
  coachPerformance: SportsReportChartPoint[];
  tournamentActivity: SportsReportChartPoint[];
  matchResultsTrend: SportsReportChartPoint[];
  achievementsByType: SportsReportChartPoint[];
  certificatesTrend: SportsReportChartPoint[];
}

export type SportsReportExportFormat = "pdf" | "excel" | "csv";

export const SPORTS_REPORT_MODULE_LABELS: Record<SportsReportModuleId, string> = {
  teams: "Teams",
  activities: "Activities",
  practice: "Practice Sessions",
  attendance: "Attendance",
  coach_performance: "Coach Performance",
  tournaments: "Tournaments",
  match_results: "Match Results",
  achievements: "Achievements",
  certificates: "Certificates",
};

export const SPORTS_REPORT_ACADEMIC_YEARS = ["2025–26", "2024–25", "2026–27"] as const;
