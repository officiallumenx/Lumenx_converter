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
  status: StaffAttendanceStatus;
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
  marks: StaffAttendanceMarkItem[];
};
