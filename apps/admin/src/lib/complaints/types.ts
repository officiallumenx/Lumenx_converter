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

/** Existing Complaints page list/kanban model. */
export type ComplaintListItem = {
  id: string;
  title: string;
  from: string;
  role: string;
  destination: ComplaintDestination;
  priority: "Low" | "Medium" | "High";
  status: "pending" | "review" | "resolved" | "rejected";
  time: string;
  body: string;
};

export type ListComplaintsParams = {
  instituteId: string;
  status?: ComplaintStatus;
  destination?: ComplaintDestination;
  priority?: ComplaintPriority;
  studentId?: string;
  teacherId?: string;
};
