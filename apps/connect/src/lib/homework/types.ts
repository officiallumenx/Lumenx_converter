export type HomeworkKind = "homework" | "assignment";
export type HomeworkStatus = "draft" | "published" | "expired";
export type HomeworkSubmissionStatus = "missing" | "submitted";

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

export type HomeworkAttachmentDto = {
  assetId: string;
  fileName: string | null;
  contentType: string | null;
};

export type LearnerHomeworkItemDto = {
  id: string;
  kind: HomeworkKind;
  title: string;
  description: string;
  instructions: string | null;
  dueDate: string;
  subjectName: string;
  teacherName: string;
  publishedOn: string | null;
  attachment: HomeworkAttachmentDto | null;
};

export type HomeworkSubmissionDto = {
  id: string;
  homeworkId: string;
  studentId: string;
  enrollmentId: string;
  studentName: string;
  rollNo: string | null;
  status: HomeworkSubmissionStatus;
  markedAt: string | null;
};

export type TeacherHomeworkSheetDto = {
  homeworkId: string;
  title: string;
  kind: HomeworkKind;
  dueDate: string;
  status: HomeworkStatus;
  sectionId: string;
  subjectName: string;
  submittedCount: number;
  totalCount: number;
  rows: HomeworkSubmissionDto[];
};

export type ListHomeworkParams = {
  instituteId: string;
  sectionId?: string;
  subjectId?: string;
  teacherId?: string;
  status?: HomeworkStatus;
  kind?: HomeworkKind;
};

export type CreateHomeworkInput = {
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
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
  attachmentAssetId?: string | null;
};

export type AssetDto = {
  id: string;
  instituteId: string;
  bucket: string;
  objectPath: string;
  fileName: string | null;
  contentType: string | null;
};
