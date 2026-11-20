/** Mirrors backend LeaveRequestDto — keep in sync with domains/leave/types.ts. */

import type { LeaveStatus } from "@lumenx/types";

export type { LeaveStatus };

export type LeaveSubjectKind = "student" | "teacher";

export type TeacherLeaveType = "sick" | "casual" | "emergency" | "permission";
export type StudentLeaveType = "general";
export type LeaveType = TeacherLeaveType | StudentLeaveType;

export type IntendedApproverRole = "institute_admin" | "principal";

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

/**
 * Presentation-only row consumed by the Leave admin route.
 * Never used as tenant/auth authority.
 */
export type LeaveListItem = {
  id: string;
  subjectKind: LeaveSubjectKind;
  name: string;
  className: string;
  dept: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  applied: string;
  type: string;
  toRole: string;
  /** Decision note from leave_decision when status is not pending. */
  decisionNote?: string;
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
