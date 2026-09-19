/** Student remarks — Connect teacher notes visible to parent/admin. */

export type RemarkType =
  | "academic"
  | "behaviour"
  | "improvement"
  | "parent_note";

export type StudentRemarkRow = {
  id: string;
  institute_id: string;
  student_id: string;
  author_teacher_id: string;
  author_user_id: string;
  remark_type: RemarkType;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StudentRemarkDto = {
  id: string;
  instituteId: string;
  studentId: string;
  studentName: string | null;
  authorTeacherId: string;
  authorUserId: string;
  authorName: string | null;
  type: RemarkType;
  text: string;
  createdAt: string;
  updatedAt: string;
  visibleTo: Array<"teacher" | "parent" | "admin">;
};

export type CreateStudentRemarkInput = {
  instituteId: string;
  studentId: string;
  type: RemarkType;
  text: string;
};

export type UpdateStudentRemarkInput = {
  text: string;
};

export type ListStudentRemarksFilter = {
  instituteId: string;
  studentId?: string;
};
