/** Mirrors backend marks portal DTOs. */

export type MarkEntryStatus =
  | "pending"
  | "submitted"
  | "published"
  | "returned"
  | "rejected";

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
  status: MarkEntryStatus | "none";
  rows: TeacherMarkSheetRowDto[];
};

export type ConnectMarkRow = {
  studentId: string;
  enrollmentId: string;
  studentName: string;
  roll: string;
  marks: number | null;
  maxMarks: number;
};

export type MarkScoreInput = {
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
  maxMarks: number;
  scores?: MarkScoreInput[];
};

export type UpdateMarkEntryInput = {
  maxMarks?: number;
  scores?: MarkScoreInput[];
};

export type ListMarkEntriesParams = {
  instituteId: string;
  sectionId?: string;
  examId?: string;
  subjectId?: string;
  teacherId?: string;
  status?: MarkEntryStatus;
};

export type GetTeacherMarkSheetParams = {
  instituteId: string;
  sectionId: string;
  examId: string;
  subjectId: string;
};

export type GetStudentReportCardsParams = {
  instituteId: string;
  studentId: string;
};
