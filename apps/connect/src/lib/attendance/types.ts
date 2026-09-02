export type AttendanceDayStatus =
  | "present"
  | "absent"
  | "leave"
  | "holiday"
  | "future"
  | "unknown";

export type AttendanceDay = {
  day: number;
  status: AttendanceDayStatus;
  holidayTitle?: string;
};

export type InstituteHoliday = {
  id: string;
  date: string;
  title: string;
  purpose: string;
};

export type AttendancePeriodSummary = {
  monthLabel: string;
  year: number;
  month: number;
  workingDays: number;
  present: number;
  absent: number;
  leave: number;
  holidays: number;
  attendancePct: number;
  rangeLabel?: string;
};

export type AttendanceMarkStatus = "present" | "absent" | "leave";

export type AttendanceRegisterStatus = "draft" | "submitted";

export type AttendanceSlotKind = "day" | "morning" | "afternoon" | "period";

export type AttendanceRegisterDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  configVersionId: string;
  method: string;
  owner: string;
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
  marks?: Array<{
    id: string;
    enrollmentId: string;
    studentId: string;
    status: AttendanceMarkStatus;
  }>;
};

export type AttendanceConfigDto = {
  id: string;
  instituteId: string;
  effectiveFrom: string;
  method: "daily" | "morning_first_period" | "morning_afternoon" | "period_wise";
  owner: string;
  scope: string;
  classCodes: string[];
  sectionCodes: string[];
};

export type PortalAttendanceDayStatus =
  | "present"
  | "absent"
  | "leave"
  | "unknown";

export type PortalLearnerAttendanceDto = {
  instituteId: string;
  studentId: string;
  fromDate: string;
  toDate: string;
  days: Array<{ date: string; status: PortalAttendanceDayStatus }>;
  summary: {
    present: number;
    absent: number;
    leave: number;
    unknown: number;
    attendancePct: number;
  };
};

export type PortalTeacherAttendanceSlotDto = {
  slotCode: string;
  slotKind: AttendanceSlotKind;
  slotLabel: string;
  periodIndex: number | null;
  timetableSlotId: string | null;
  subjectLabel: string | null;
  startsAt: string | null;
  endsAt: string | null;
  registerId: string | null;
  registerStatus: AttendanceRegisterStatus | null;
};

export type PortalTeacherAttendanceDto = {
  instituteId: string;
  sectionId: string;
  classId: string;
  academicYearId: string;
  attendanceDate: string;
  method: string | null;
  configVersionId: string | null;
  slots: PortalTeacherAttendanceSlotDto[];
};
