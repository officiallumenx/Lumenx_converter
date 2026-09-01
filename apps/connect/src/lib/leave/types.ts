/** Mirrors backend leave DTOs — keep in sync with domains/leave/types.ts. */

export type LeaveSubjectKind = "student" | "teacher";

export type LeaveStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "ignored"
  | "cancelled";

export type TeacherLeaveType = "sick" | "casual" | "emergency" | "permission";

export type IntendedApproverRole = "institute_admin" | "principal";

export type LeaveRequestDto = {
  id: string;
  instituteId: string;
  subjectKind: LeaveSubjectKind;
  studentId: string | null;
  teacherId: string | null;
  requestedByUserId: string;
  leaveType: string;
  intendedApproverRole: IntendedApproverRole | null;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  academicYearId: string | null;
  classId: string | null;
  sectionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeaveDecisionDto = {
  id: string;
  instituteId: string;
  leaveRequestId: string;
  outcome: "approved" | "rejected" | "ignored";
  note: string | null;
  decidedByUserId: string;
  decidedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type DecideLeaveResult = {
  request: LeaveRequestDto;
  decision: LeaveDecisionDto;
};

export type ListLeaveRequestsParams = {
  instituteId: string;
  subjectKind?: LeaveSubjectKind;
  status?: LeaveStatus;
  studentId?: string;
  teacherId?: string;
};

export type CreateStudentLeaveInput = {
  instituteId: string;
  studentId: string;
  startDate: string;
  endDate: string;
  reason: string;
};

export type CreateTeacherLeaveInput = {
  instituteId: string;
  leaveType: TeacherLeaveType;
  intendedApproverRole: IntendedApproverRole;
  startDate: string;
  endDate: string;
  reason: string;
};

export type DecideLeaveInput = {
  outcome: "approved" | "rejected" | "ignored";
  note?: string | null;
};

/** Parent-facing leave row mapped from API. */
export type ConnectLeaveRequest = {
  id: string;
  childId: string;
  childName: string;
  className: string;
  section: string;
  leaveStartDate: string;
  leaveEndDate: string;
  description: string;
  status: LeaveStatus;
  appliedAt: string;
  updatedAt: string;
  teacherNote?: string;
};

export type StudentNameLookup = Map<
  string,
  { name: string; className: string; section: string }
>;
