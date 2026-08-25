/** Staff / teacher shared unions and record shape (Admin directory). */

export type TeacherRole = "subject-teacher" | "activity-coordinator" | "both";

export type TeacherStatus = "active" | "on-leave" | "pending";

/** Canonical teacher directory row persisted in Admin localStorage. */
export type TeacherRecord = {
  id: string;
  name: string;
  role: TeacherRole;
  dept: string;
  email: string;
  phone: string;
  password: string;
  employeeId: string;
  joined: string;
  dateOfBirth?: string;
  classes: number;
  assignedSections: string[];
  status: TeacherStatus;
  subjects: string[];
  portalAccess: string;
  qualification: string;
  lastLogin: string;
  credentialsSentAt: string | null;
};
