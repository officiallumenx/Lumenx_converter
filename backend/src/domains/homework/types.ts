/** Homework domain types aligned to public.homework. */

export type HomeworkKind = "homework" | "assignment";

export type HomeworkStatus = "draft" | "published" | "expired";

export type HomeworkRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  kind: HomeworkKind;
  title: string;
  description: string;
  instructions: string | null;
  due_date: string;
  status: HomeworkStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type HomeworkDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  kind: HomeworkKind;
  title: string;
  description: string;
  instructions: string | null;
  dueDate: string;
  status: HomeworkStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateHomeworkInput = {
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  /** Ignored for authorization; teachers use JWT identity. */
  teacherId?: string;
  kind: HomeworkKind;
  title: string;
  description: string;
  instructions?: string | null;
  dueDate: string;
};

export type UpdateHomeworkInput = {
  title?: string;
  description?: string;
  instructions?: string | null;
  dueDate?: string;
  kind?: HomeworkKind;
};

export type ListHomeworkFilter = {
  instituteId: string;
  academicYearId?: string;
  sectionId?: string;
  subjectId?: string;
  teacherId?: string;
  status?: HomeworkStatus;
  kind?: HomeworkKind;
  dueFrom?: string;
  dueTo?: string;
};
