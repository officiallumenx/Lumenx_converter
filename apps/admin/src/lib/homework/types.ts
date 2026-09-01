export type HomeworkKind = "homework" | "assignment";

export type HomeworkStatus = "draft" | "published" | "expired";

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
  attachmentAssetId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListHomeworkParams = {
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

export type HomeworkListItem = {
  id: string;
  instituteId: string;
  title: string;
  description: string;
  instructions: string | null;
  kind: HomeworkKind;
  status: HomeworkStatus;
  dueDate: string;
  teacherId: string;
  teacherName: string;
  classLabel: string;
  subjectLabel: string;
  publishedAt: string | null;
  updatedAt: string;
};
