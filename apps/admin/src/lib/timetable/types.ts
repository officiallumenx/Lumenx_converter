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

export type TeacherAssignmentDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  status: "active" | "inactive";
};

export type ListTimetableSlotsParams = {
  instituteId: string;
  academicYearId?: string;
  sectionId?: string;
  teacherId?: string;
};

export type ListTeacherAssignmentsParams = {
  instituteId: string;
  academicYearId?: string;
  sectionId?: string;
  classId?: string;
  status?: "active" | "inactive";
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

export type TeacherAssignmentListItem = {
  id: string;
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  status: "active" | "inactive";
  label: string;
};

export type TimetableSectionSummary = {
  sectionId: string;
  classLabel: string;
  sectionLabel: string;
  slotCount: number;
  activeCount: number;
  inactiveCount: number;
  publishStatus: TimetablePublishStatus;
};

export type TimetablePublishStatus = "empty" | "draft" | "published";

export type TimetableInstituteSummary = {
  sectionCount: number;
  draftCount: number;
  publishedCount: number;
  totalSlots: number;
};

export type TimetableReadBundle = {
  slots: TimetableSlotListItem[];
  sections: TimetableSectionSummary[];
};
