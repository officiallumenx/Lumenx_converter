/**
 * Leave API repository — API auth mode only.
 * Never called from demo mode; institute UUID validated before any fetch.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { LeaveRequestDto, ListLeaveRequestsParams, LeaveDecisionDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Leave API is only available in API auth mode");
  }
}

export async function listLeaveRequests(
  params: ListLeaveRequestsParams,
  client: AdminApiClient = getAdminApiClient(),
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

export async function getLeaveDecision(
  leaveId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<LeaveDecisionDto> {
  assertApiMode();
  if (!isInstituteUuid(leaveId)) {
    throw new Error("leave_id must be a valid UUID");
  }
  return client.get<LeaveDecisionDto>(
    `/api/v1/leave/requests/${leaveId.trim()}/decision`,
  );
}
