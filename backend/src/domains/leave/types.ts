/** Leave foundation types aligned to leave_request / leave_decision. */

export type LeaveSubjectKind = "student" | "teacher";
export type LeaveStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "ignored"
  | "cancelled";
export type LeaveDecisionOutcome = "approved" | "rejected" | "ignored";
export type StudentLeaveType = "general";
export type TeacherLeaveType = "sick" | "casual" | "emergency" | "permission";
export type LeaveType = StudentLeaveType | TeacherLeaveType;
export type IntendedApproverRole = "institute_admin" | "principal";

export type LeaveRequestRow = {
  id: string;
  institute_id: string;
  subject_kind: LeaveSubjectKind;
  student_id: string | null;
  teacher_id: string | null;
  requested_by_user_id: string;
  leave_type: LeaveType;
  intended_approver_role: IntendedApproverRole | null;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  academic_year_id: string | null;
  class_id: string | null;
  section_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type LeaveDecisionRow = {
  id: string;
  institute_id: string;
  leave_request_id: string;
  outcome: LeaveDecisionOutcome;
  note: string | null;
  decided_by_user_id: string;
  decided_at: string;
  created_at: string;
  updated_at: string;
};

export type LeaveRequestDto = {
  id: string;
  instituteId: string;
  subjectKind: LeaveSubjectKind;
  studentId: string | null;
  teacherId: string | null;
  requestedByUserId: string;
  leaveType: LeaveType;
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
  outcome: LeaveDecisionOutcome;
  note: string | null;
  decidedByUserId: string;
  decidedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ListLeaveRequestsFilter = {
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
  outcome: LeaveDecisionOutcome;
  note?: string | null;
};
