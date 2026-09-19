export type StaffAttendanceStatus =
  | "present"
  | "late"
  | "absent"
  | "leave"
  | "half-day";

/** Flowchart mark statuses: present | absent | half day | leave */
export type StaffAttendanceMarkStatus =
  | "present"
  | "absent"
  | "leave"
  | "half-day";

export const STAFF_ATTENDANCE_MARK_STATUSES: readonly StaffAttendanceMarkStatus[] =
  ["present", "absent", "half-day", "leave"] as const;

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
  date?: string;
  teacherId?: string;
  dayStatus?: StaffAttendanceDayStatus;
  from?: string;
  to?: string;
};

export type StaffAttendanceMarkItem = {
  id: string;
  teacherId: string;
  teacherName: string;
  /** null = unmarked (must select before submit) */
  status: StaffAttendanceStatus | null;
  checkIn: string | null;
  checkOut: string | null;
  note: string | null;
  dayStatus: StaffAttendanceDayStatus;
};

export type StaffAttendanceDaySummary = {
  date: string;
  dayStatus: StaffAttendanceDayStatus;
  submittedAt: string | null;
  total: number;
  present: number;
  late: number;
  absent: number;
  leave: number;
  halfDay: number;
  unmarked: number;
  marks: StaffAttendanceMarkItem[];
};
