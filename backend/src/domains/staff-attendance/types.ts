/** Staff attendance foundation types aligned to staff_attendance (faculty). */

export type StaffAttendanceStatus =
  | "present"
  | "late"
  | "absent"
  | "leave"
  | "half-day";

export type StaffAttendanceDayStatus = "draft" | "submitted";

export type StaffAttendanceRow = {
  id: string;
  institute_id: string;
  teacher_id: string;
  attendance_date: string;
  status: StaffAttendanceStatus;
  check_in: string | null;
  check_out: string | null;
  note: string | null;
  day_status: StaffAttendanceDayStatus;
  marked_by_user_id: string;
  submitted_at: string | null;
  submitted_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

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

export type ListStaffAttendanceFilter = {
  instituteId: string;
  attendanceDate?: string;
  teacherId?: string;
  dayStatus?: StaffAttendanceDayStatus;
  from?: string;
  to?: string;
};

export type UpsertStaffAttendanceMarkInput = {
  teacherId: string;
  status: StaffAttendanceStatus;
  checkIn?: string | null;
  checkOut?: string | null;
  note?: string | null;
};

export type UpsertStaffAttendanceDayInput = {
  instituteId: string;
  attendanceDate: string;
  marks: UpsertStaffAttendanceMarkInput[];
};

export type DayActionInput = {
  instituteId: string;
  attendanceDate: string;
};
