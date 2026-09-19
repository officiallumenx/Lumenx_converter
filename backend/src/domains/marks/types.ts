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
  internal_marks: number | null;
  external_marks: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MarkScoreDto = {
  id: string;
  enrollmentId: string;
  studentId: string;
  marks: number | null;
  internalMarks: number | null;
  externalMarks: number | null;
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
  internalMarks?: number | null;
  externalMarks?: number | null;
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

export type MarkPublicationRow = {
  id: string;
  institute_id: string;
  mark_entry_id: string;
  academic_year_id: string;
  class_id: string;
  section_id: string;
  exam_id: string;
  subject_id: string;
  published_at: string;
  published_by_user_id: string;
  score_count: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MarkPublicationDto = {
  id: string;
  instituteId: string;
  markEntryId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  examId: string;
  subjectId: string;
  publishedAt: string;
  publishedByUserId: string;
  scoreCount: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReportCardSubjectDto = {
  subjectId: string;
  subject: string;
  marks: number;
  maxMarks: number;
  total: number;
  grade: string;
  teacherName: string;
};

export type StudentReportCardDto = {
  id: string;
  examId: string;
  examName: string;
  term: string;
  publishedOn: string;
  marks: ReportCardSubjectDto[];
  percentage: number;
  grade: string;
  status: "published";
};

export type TeacherMarkSheetRowDto = {
  studentId: string;
  enrollmentId: string;
  studentName: string;
  rollNo: string | null;
  marks: number | null;
  internalMarks: number | null;
  externalMarks: number | null;
};

export type TeacherMarkSheetDto = {
  entryId: string | null;
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  examId: string;
  examName: string;
  subjectId: string;
  subjectName: string;
  maxMarks: number;
  /** Exam scheme ceilings when configured. */
  internalMax: number | null;
  externalMax: number | null;
  status: MarkEntryStatus | "none";
  rows: TeacherMarkSheetRowDto[];
};
