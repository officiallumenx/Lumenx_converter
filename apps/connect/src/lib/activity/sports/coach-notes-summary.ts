import type { CoachNoteRecord, CoachNoteSummary } from "./coach-notes-types";

export function computeCoachNoteSummary(records: CoachNoteRecord[]): CoachNoteSummary {
  return {
    excellent: records.filter((r) => r.performanceRating === "excellent").length,
    good: records.filter((r) => r.performanceRating === "good").length,
    average: records.filter((r) => r.performanceRating === "average").length,
    needsImprovement: records.filter((r) => r.performanceRating === "needs_improvement").length,
    followUpRequired: records.filter((r) => r.followUpRequired).length,
    total: records.length,
  };
}

/** Average metric score — useful for future trend analytics. */
export function averageMetricScore(record: CoachNoteRecord): number {
  const values = Object.values(record.metrics);
  return values.length > 0
    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
    : 0;
}
