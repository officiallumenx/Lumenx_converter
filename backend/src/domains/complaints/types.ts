/** Complaints foundation types aligned to complaint table. */

export type ComplaintStatus =
  | "draft"
  | "pending"
  | "review"
  | "forwarded"
  | "resolved"
  | "rejected"
  | "closed"
  | "archived";

export type ComplaintPriority = "low" | "medium" | "high";
export type ComplaintDestination = "class_teacher" | "principal_admin";

export type ComplaintRow = {
  id: string;
  institute_id: string;
  title: string;
  body: string;
  category: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  destination: ComplaintDestination | null;
  requested_by_user_id: string;
  student_id: string | null;
  teacher_id: string | null;
  response_note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ComplaintDto = {
  id: string;
  instituteId: string;
  title: string;
  body: string;
  category: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  destination: ComplaintDestination | null;
  requestedByUserId: string;
  studentId: string | null;
  teacherId: string | null;
  responseNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListComplaintsFilter = {
  instituteId: string;
  status?: ComplaintStatus;
  destination?: ComplaintDestination;
  priority?: ComplaintPriority;
  studentId?: string;
  teacherId?: string;
};

export type CreateComplaintInput = {
  instituteId: string;
  title: string;
  body: string;
  category: string;
  priority?: ComplaintPriority;
  destination?: ComplaintDestination | null;
  studentId?: string | null;
  asDraft?: boolean;
};

export type UpdateComplaintInput = {
  title?: string;
  body?: string;
  category?: string;
  priority?: ComplaintPriority;
  destination?: ComplaintDestination | null;
};

export type TransitionComplaintInput = {
  status: ComplaintStatus;
  responseNote?: string | null;
};
