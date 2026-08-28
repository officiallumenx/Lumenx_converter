export type TimetableSlotStatus = "active" | "inactive";

export type TimetableSlotDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  teacherAssignmentId: string;
  dayOfWeek: number;
  periodIndex: number;
  startsAt: string;
  endsAt: string;
  room: string | null;
  status: TimetableSlotStatus;
  createdAt: string;
  updatedAt: string;
};

export type ListTimetableSlotsParams = {
  instituteId: string;
  academicYearId?: string;
  sectionId?: string;
  teacherId?: string;
};

export type TimetableSlotListItem = {
  id: string;
  sectionId: string;
  classId: string;
  classLabel: string;
  sectionLabel: string;
  dayOfWeek: number;
  dayLabel: string;
  periodIndex: number;
  startsAt: string;
  endsAt: string;
  room: string | null;
  status: TimetableSlotStatus;
  teacherAssignmentId: string;
  academicYearId: string;
};

export type TimetableSectionSummary = {
  sectionId: string;
  classLabel: string;
  sectionLabel: string;
  slotCount: number;
  activeCount: number;
};

export type TimetableReadBundle = {
  slots: TimetableSlotListItem[];
  sections: TimetableSectionSummary[];
};
