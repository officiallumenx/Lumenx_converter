/** Mirrors backend StaffAttendanceDto — keep in sync with domains/staff-attendance. */

export type StaffAttendanceStatus =
  | "present"
  | "late"
  | "absent"
  | "leave"
  | "half-day";

export type StaffAttendanceDayStatus = "draft" | "submitted";

export type StaffAttendanceDto = {
  id: string;
  instituteId: string;
  teacherId: string;
  attendanceDate: string;
  status: StaffAttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  note: string | null;
  dayStatus: StaffAttendanceDayStatus;
  markedByUserId: string;
  submittedAt: string | null;
  submittedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListStaffAttendanceParams = {
  instituteId: string;
  teacherId?: string;
  dayStatus?: StaffAttendanceDayStatus;
  from?: string;
  to?: string;
  date?: string;
};

export type TeacherSelfAttendanceSummary = {
  days: number;
  present: number;
  late: number;
  half: number;
  leave: number;
  absent: number;
  attendancePct: number;
  /** Submitted marks only (drives percentage). */
  submitted: StaffAttendanceDto[];
  /** All marks in range, newest first. */
  records: StaffAttendanceDto[];
};
