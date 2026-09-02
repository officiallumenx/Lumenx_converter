import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type { PortalTimetableDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Timetable API is only available in API auth mode");
  }
}

export async function getLearnerTimetable(
  params: { instituteId: string; studentId: string },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<PortalTimetableDto> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId) || !isInstituteUuid(params.studentId)) {
    throw new Error("institute_id and student_id must be valid UUIDs");
  }
  const query = new URLSearchParams({ institute_id: params.instituteId.trim() });
  return client.get<PortalTimetableDto>(
    `/api/v1/timetable/portal/students/${params.studentId.trim()}?${query.toString()}`,
  );
}

export async function getTeacherTimetable(
  params: { instituteId: string; teacherId?: string; sectionId?: string },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<PortalTimetableDto> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams({ institute_id: params.instituteId.trim() });
  if (params.teacherId) query.set("teacher_id", params.teacherId.trim());
  if (params.sectionId) query.set("section_id", params.sectionId.trim());
  return client.get<PortalTimetableDto>(
    `/api/v1/timetable/portal/teacher?${query.toString()}`,
  );
}
