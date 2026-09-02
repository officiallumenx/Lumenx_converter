export type PortalTimetablePeriodDto = {
  id: string;
  dayOfWeek: number;
  dayLabel: string;
  periodIndex: number;
  time: string;
  subject: string;
  teacher: string;
  room: string | null;
};

export type PortalTimetableDto = {
  instituteId: string;
  studentId: string | null;
  sectionId: string | null;
  periods: PortalTimetablePeriodDto[];
  weekdays: string[];
};

export type WeeklyTimetable = Record<
  string,
  Array<{ time: string; subject: string; teacher: string }>
>;
