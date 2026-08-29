/**
 * Teacher performance rows for Admin rankings.
 * Ratings are placeholders until a dedicated feedback/ratings table exists.
 */

export type TeacherPerformanceDto = {
  teacherId: string;
  name: string;
  department: string;
  /** Placeholder rating (neutral 4.0) until feedback tables exist. */
  rating: number;
  /** Placeholder trend string until feedback history exists. */
  trend: string;
};
