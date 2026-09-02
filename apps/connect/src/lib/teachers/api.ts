import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type { PortalLearnerFacultyDto, PortalTeacherSelfDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Teachers API is only available in API auth mode");
  }
}

export async function getLearnerFacultyPortal(
  params: { instituteId: string; studentId: string },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<PortalLearnerFacultyDto> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId) || !isInstituteUuid(params.studentId)) {
    throw new Error("institute_id and student_id must be valid UUIDs");
  }
  const query = new URLSearchParams({ institute_id: params.instituteId.trim() });
  return client.get<PortalLearnerFacultyDto>(
    `/api/v1/teachers/portal/students/${params.studentId.trim()}?${query.toString()}`,
  );
}

export async function getTeacherSelfPortal(
  params: { instituteId: string; teacherId?: string },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<PortalTeacherSelfDto> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams({ institute_id: params.instituteId.trim() });
  if (params.teacherId) query.set("teacher_id", params.teacherId.trim());
  return client.get<PortalTeacherSelfDto>(
    `/api/v1/teachers/portal/me?${query.toString()}`,
  );
}
