/** Diary domain types aligned to diary_day / diary_day_row. */

export type DiaryScope = "subject" | "activity";

export type DiaryDayRecord = {
  id: string;
  institute_id: string;
  academic_year_id: string | null;
  teacher_id: string;
  diary_date: string;
  scope: DiaryScope;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DiaryDayRowRecord = {
  id: string;
  institute_id: string;
  diary_day_id: string;
  section_id: string | null;
  class_label: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DiaryDayRowDto = {
  id: string;
  sectionId: string | null;
  classLabel: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type DiaryDayRowInput = {
  sectionId?: string | null;
  classLabel: string;
  description: string;
  sortOrder?: number;
};

export type DiaryDayDto = {
  id: string;
  instituteId: string;
  academicYearId: string | null;
  teacherId: string;
  diaryDate: string;
  scope: DiaryScope;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  rows: DiaryDayRowDto[];
};

export type CreateDiaryDayInput = {
  instituteId: string;
  academicYearId?: string | null;
  /**
   * Teachers: ignored (JWT teacher identity wins).
   * Governance staff: required — target teacher in the institute.
   */
  teacherId?: string;
  diaryDate: string;
  scope: DiaryScope;
  rows?: DiaryDayRowInput[];
};

export type UpdateDiaryDayInput = {
  academicYearId?: string | null;
  rows?: DiaryDayRowInput[];
};

export type ListDiaryFilter = {
  instituteId: string;
  teacherId?: string;
  academicYearId?: string;
  scope?: DiaryScope;
  diaryDate?: string;
  dateFrom?: string;
  dateTo?: string;
  /** When true: submitted_at IS NOT NULL; when false: submitted_at IS NULL. */
  submitted?: boolean;
};
