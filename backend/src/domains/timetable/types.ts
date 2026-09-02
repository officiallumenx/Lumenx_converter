/** Persisted timetable_slot row (snake_case DB shape). */
export type TimetableSlotRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  class_id: string;
  section_id: string;
  teacher_assignment_id: string;
  day_of_week: number;
  period_index: number;
  starts_at: string;
  ends_at: string;
  room: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/** Public API slot shape. */
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
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

export type CreateTimetableSlotInput = {
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  teacherAssignmentId: string;
  dayOfWeek: number;
  periodIndex: number;
  startsAt: string;
  endsAt: string;
  room?: string | null;
  status?: "active" | "inactive";
};

export type UpdateTimetableSlotInput = {
  teacherAssignmentId?: string;
  dayOfWeek?: number;
  periodIndex?: number;
  startsAt?: string;
  endsAt?: string;
  room?: string | null;
  status?: "active" | "inactive";
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
};

export type ListTimetableSlotsFilter = {
  instituteId: string;
  academicYearId?: string;
  sectionId?: string;
  /** Resolved via teacher_assignment — not a column on timetable_slot. */
  teacherId?: string;
};

/** Public teacher_assignment shape for timetable slot create/edit pickers. */
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

export type ListTeacherAssignmentsFilter = {
  instituteId: string;
  academicYearId?: string;
  sectionId?: string;
  classId?: string;
  teacherId?: string;
  status?: "active" | "inactive";
};

export type CreateTeacherAssignmentInput = {
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  status?: "active" | "inactive";
};

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
