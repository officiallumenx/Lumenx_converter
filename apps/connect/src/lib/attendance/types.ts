export type AttendanceDayStatus = "present" | "absent" | "leave" | "holiday" | "future";

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
