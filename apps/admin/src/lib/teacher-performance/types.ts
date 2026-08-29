/** Mirrors backend TeacherPerformanceDto. Ratings may be placeholders. */

export type TeacherPerformanceDto = {
  teacherId: string;
  name: string;
  department: string;
  rating: number;
  trend: string;
};
