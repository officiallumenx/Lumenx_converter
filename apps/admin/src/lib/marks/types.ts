/** Mirrors backend MarkEntryDto — keep in sync with domains/marks/types.ts. */

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

export type MarkStudentScoreItem = {
  studentId: string;
  /** Present for API entries — required when updating scores. */
  enrollmentId?: string;
  rollNo: string;
  name: string;
  marks: number | null;
};

/**
 * Presentation row shape-compatible with demo MarkEntry for shared marks UI.
 */
export type MarkEntryListItem = {
  id: string;
  instituteId?: string;
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  classGrade: string;
  section: string;
  examId: string;
  examName: string;
  maxMarks: number;
  status: MarkEntryStatus;
  submittedAt?: string;
  publishedAt?: string;
  adminNote?: string;
  students: MarkStudentScoreItem[];
};

export type ListMarkEntriesParams = {
  instituteId: string;
  academicYearId?: string;
  sectionId?: string;
  examId?: string;
  subjectId?: string;
  teacherId?: string;
  status?: MarkEntryStatus;
};

export type MarksLookupMaps = {
  examsById?: Map<string, { id: string; name: string }>;
  subjectsById?: Map<string, { id: string; name: string; code?: string }>;
  teachersById?: Map<string, { id: string; name: string }>;
  classesById?: Map<string, { id: string; name: string; code?: string }>;
  sectionsById?: Map<
    string,
    { id: string; name: string; code?: string; classId: string }
  >;
  enrollmentsById?: Map<
    string,
    { id: string; studentId: string; studentName: string; rollNo: string }
  >;
};
