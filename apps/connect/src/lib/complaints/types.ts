/** Mirrors backend ComplaintDto — keep in sync with domains/complaints/types.ts. */

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

export type ListComplaintsParams = {
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

/** Parent / student list row. */
export type ConnectComplaintItem = {
  id: string;
  title: string;
  category: string;
  destination: ComplaintDestination;
  priorityLabel: "Low" | "Medium" | "High";
  statusLabel: string;
  status: ComplaintStatus;
  body: string;
  responseNote: string | null;
  createdAtLabel: string;
  studentId: string | null;
};
