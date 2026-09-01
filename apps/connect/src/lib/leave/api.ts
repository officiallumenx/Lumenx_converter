import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type {
  CreateStudentLeaveInput,
  CreateTeacherLeaveInput,
  DecideLeaveInput,
  DecideLeaveResult,
  LeaveDecisionDto,
  LeaveRequestDto,
  ListLeaveRequestsParams,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Leave API is only available in API auth mode");
  }
}

export async function listLeaveRequests(
  params: ListLeaveRequestsParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<LeaveRequestDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.subjectKind) query.set("subject_kind", params.subjectKind);
  if (params.status) query.set("status", params.status);
  if (params.studentId) query.set("student_id", params.studentId);
  if (params.teacherId) query.set("teacher_id", params.teacherId);

  return client.get<LeaveRequestDto[]>(
    `/api/v1/leave/requests?${query.toString()}`,
  );
}

export async function createStudentLeave(
  input: CreateStudentLeaveInput,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<LeaveRequestDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId) || !isInstituteUuid(input.studentId)) {
    throw new Error("institute_id and student_id must be valid UUIDs");
  }
  return client.post<LeaveRequestDto>("/api/v1/leave/requests", {
    subject_kind: "student",
    institute_id: input.instituteId.trim(),
    student_id: input.studentId.trim(),
    start_date: input.startDate,
    end_date: input.endDate,
    reason: input.reason,
  });
}

export async function createTeacherLeave(
  input: CreateTeacherLeaveInput,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<LeaveRequestDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<LeaveRequestDto>("/api/v1/leave/requests", {
    subject_kind: "teacher",
    institute_id: input.instituteId.trim(),
    leave_type: input.leaveType,
    intended_approver_role: input.intendedApproverRole,
    start_date: input.startDate,
    end_date: input.endDate,
    reason: input.reason,
  });
}

export async function decideLeave(
  leaveId: string,
  input: DecideLeaveInput,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<DecideLeaveResult> {
  assertApiMode();
  if (!isInstituteUuid(leaveId)) {
    throw new Error("leave_id must be a valid UUID");
  }
  return client.post<DecideLeaveResult>(
    `/api/v1/leave/requests/${leaveId.trim()}/decide`,
    {
      outcome: input.outcome,
      note: input.note,
    },
  );
}

export async function cancelLeave(
  leaveId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<LeaveRequestDto> {
  assertApiMode();
  if (!isInstituteUuid(leaveId)) {
    throw new Error("leave_id must be a valid UUID");
  }
  return client.post<LeaveRequestDto>(
    `/api/v1/leave/requests/${leaveId.trim()}/cancel`,
  );
}

export async function getLeaveDecision(
  leaveId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<LeaveDecisionDto> {
  assertApiMode();
  if (!isInstituteUuid(leaveId)) {
    throw new Error("leave_id must be a valid UUID");
  }
  return client.get<LeaveDecisionDto>(
    `/api/v1/leave/requests/${leaveId.trim()}/decision`,
  );
}
