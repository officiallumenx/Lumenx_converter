/**
 * Teacher performance rows for Admin rankings.
 * Ratings use the Operational Performance Index (OPI) from institute activity signals.
 */

export type TeacherPerformanceMetrics = {
  staffAttendanceRate: number | null;
  publishedMarks: number;
  publishedHomework: number;
  submittedDiaryDays: number;
  submittedAttendanceRegisters: number;
};

export type TeacherPerformanceDto = {
  teacherId: string;
  name: string;
  department: string;
  /** OPI score 0–5; null when no operational signals exist in the rating window. */
  rating: number | null;
  /** Month-over-month delta formatted as +0.12 / -0.05 / 0.00 */
  trend: string;
  /** Rank within institute (1 = highest OPI). Null when unrated. */
  rank: number | null;
  metrics: TeacherPerformanceMetrics;
  ratingSource: "operational" | "insufficient_data";
};

export type TeacherPerformanceSummary = {
  instituteAverage: number | null;
  monthlyTrend: { label: string; value: number }[];
  ratedCount: number;
  facultyCount: number;
};

export type TeacherPerformanceListResult = {
  teachers: TeacherPerformanceDto[];
  summary: TeacherPerformanceSummary;
};
