/** Mirrors backend teacher performance types. */

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
  subjects: string[];
  rating: number | null;
  trend: string;
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

export type TeacherPerformanceListPayload = {
  teachers: TeacherPerformanceDto[];
  summary: TeacherPerformanceSummary;
};

export type SubjectRanking = {
  subject: string;
  average: number;
  teacherCount: number;
};
