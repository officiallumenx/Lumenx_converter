/** Timetable publication row (snake_case DB shape). */
export type TimetablePublicationRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  class_id: string;
  section_id: string;
  published_at: string;
  published_by_user_id: string;
  note: string | null;
  slot_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/** Public API publication shape. */
export type TimetablePublicationDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  publishedAt: string;
  publishedByUserId: string;
  note: string | null;
  slotCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ListTimetablePublicationsFilter = {
  instituteId: string;
  sectionId?: string;
};
