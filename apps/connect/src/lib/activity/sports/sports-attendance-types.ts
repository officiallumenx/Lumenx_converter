/** Attendance status for a student in a practice session. */
export type SportsAttendanceStatus = "present" | "absent" | "late" | "excused";

/** Mock coach performance rating. */
export type SportsPerformanceRating =
  | "excellent"
  | "good"
  | "average"
  | "needs_improvement";

/** Child record — must always reference exactly one practice session. */
export interface SportsAttendanceRecord {
  id: string;
  practiceSessionId: string;
  /** Denormalized from parent session. */
  practiceSessionTitle: string;
  teamId: string;
  teamName: string;
  sessionDate: string;
  studentId: string;
  studentName: string;
  studentClassLabel: string;
  status: SportsAttendanceStatus;
  checkInTime?: string;
  remarks: string;
  performanceRating: SportsPerformanceRating;
  coachNotes: string;
  improvementAreas: string;
  createdAt: string;
  updatedAt: string;
}

export interface SportsAttendanceInput {
  practiceSessionId: string;
  studentId: string;
  status: SportsAttendanceStatus;
  checkInTime?: string;
  remarks: string;
  performanceRating: SportsPerformanceRating;
  coachNotes: string;
  improvementAreas: string;
}

export type SportsAttendanceSortField = "date" | "student";

export interface SportsAttendanceListFilters {
  query?: string;
  practiceSessionId?: string | "all";
  teamId?: string | "all";
  studentId?: string | "all";
  status?: SportsAttendanceStatus | "all";
  date?: string | "all";
  sortBy?: SportsAttendanceSortField;
  sortDir?: "asc" | "desc";
}

export interface SportsAttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  /** (present + late) / total × 100 */
  attendancePercentage: number;
}

export const SPORTS_ATTENDANCE_STATUS_LABELS: Record<SportsAttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

export const SPORTS_PERFORMANCE_RATING_LABELS: Record<SportsPerformanceRating, string> = {
  excellent: "Excellent",
  good: "Good",
  average: "Average",
  needs_improvement: "Needs Improvement",
};
