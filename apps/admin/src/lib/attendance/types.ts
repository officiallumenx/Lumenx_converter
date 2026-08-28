export type AttendanceRegisterStatus = "draft" | "submitted";
export type AttendanceMarkStatus = "present" | "absent" | "leave";
export type AttendanceMethod =
  | "daily"
  | "morning_first_period"
  | "morning_afternoon"
  | "period_wise";
export type AttendanceOwner =
  | "class_teacher"
  | "current_period_teacher"
  | "attendance_incharge";
export type AttendanceSlotKind = "day" | "morning" | "afternoon" | "period";

export type AttendanceMarkDto = {
  id: string;
  enrollmentId: string;
  studentId: string;
  status: AttendanceMarkStatus;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceRegisterDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  configVersionId: string;
  method: AttendanceMethod;
  owner: AttendanceOwner;
  attendanceDate: string;
  slotKind: AttendanceSlotKind;
  slotCode: string;
  periodIndex: number | null;
  timetableSlotId: string | null;
  slotLabel: string;
  subjectLabel: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: AttendanceRegisterStatus;
  markedByTeacherId: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  marks?: AttendanceMarkDto[];
};

export type ListAttendanceRegistersParams = {
  instituteId: string;
  academicYearId?: string;
  sectionId?: string;
  attendanceDate?: string;
  status?: AttendanceRegisterStatus;
};

export type AttendanceRegisterListItem = {
  id: string;
  sectionId: string;
  classId: string;
  attendanceDate: string;
  slotLabel: string;
  subjectLabel: string | null;
  status: AttendanceRegisterStatus;
  method: AttendanceMethod;
  owner: AttendanceOwner;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  totalMarks: number;
};

export type AttendanceMarkListItem = {
  id: string;
  studentId: string;
  studentName: string;
  enrollmentId: string;
  status: AttendanceMarkStatus;
};

export type AttendanceRegisterDetail = AttendanceRegisterListItem & {
  marks: AttendanceMarkListItem[];
};
