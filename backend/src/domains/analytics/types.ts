/** Institute analytics summary — Stage 9 read aggregates. */

export type AnalyticsSummaryDto = {
  instituteId: string;
  students: number;
  teachers: number;
  parents: number;
  openComplaints: number;
  pendingLeave: number;
  homeworkItems: number;
};
