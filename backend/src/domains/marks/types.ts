/** Marks domain types aligned to mark_entry / mark_score. */

export type MarkEntryStatus =
  | "pending"
  | "submitted"
  | "published"
  | "returned"
  | "rejected";

export type MarkEntryRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  class_id: string;
  section_id: string;
  exam_id: string;
  subject_id: string;
  teacher_id: string;
  max_marks: number;
  status: MarkEntryStatus;
  submitted_at: string | null;
  published_at: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MarkScoreRow = {
  id: string;
  institute_id: string;
  mark_entry_id: string;
  student_id: string;
  enrollment_id: string;
  marks: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MarkScoreDto = {
  id: string;
  enrollmentId: string;
  studentId: string;
  marks: number | null;
  createdAt: string;
  updatedAt: string;
};

export type MarkEntryDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  examId: string;
  subjectId: string;
  teacherId: string;
  maxMarks: number;
  status: MarkEntryStatus;
  submittedAt: string | null;
  publishedAt: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  scores?: MarkScoreDto[];
};

export type ScoreInput = {
  enrollmentId: string;
  marks: number | null;
};

export type CreateMarkEntryInput = {
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  examId: string;
  subjectId: string;
  /** Staff override only; teachers ignore client value. */
  teacherId?: string;
  maxMarks: number;
  scores?: ScoreInput[];
};

export type UpdateMarkEntryInput = {
  maxMarks?: number;
  scores?: ScoreInput[];
  adminNote?: string | null;
};

export type ListMarkEntriesFilter = {
  instituteId: string;
  academicYearId?: string;
  sectionId?: string;
  examId?: string;
  subjectId?: string;
  teacherId?: string;
  status?: MarkEntryStatus;
};

export type WorkflowNoteInput = {
  adminNote?: string | null;
};
