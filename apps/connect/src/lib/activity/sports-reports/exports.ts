import type { SportsReportExportFormat, SportsReportsSnapshot } from "./types";

export interface SportsReportExportResult {
  format: SportsReportExportFormat;
  fileName: string;
  rowCount: number;
  generatedAt: string;
}

export function mockExportSportsReport(
  snapshot: SportsReportsSnapshot,
  format: SportsReportExportFormat,
): SportsReportExportResult {
  const stamp = snapshot.generatedAt.slice(0, 10);
  const ext = format === "pdf" ? "pdf" : format === "excel" ? "xlsx" : "csv";
  const rowCount =
    snapshot.moduleSummaries.length +
    snapshot.teamRankings.length +
    snapshot.mvpStatistics.length +
    snapshot.monthlyGrowth.length;

  return {
    format,
    fileName: `sports-analytics-${stamp}.${ext}`,
    rowCount,
    generatedAt: new Date().toISOString(),
  };
}
