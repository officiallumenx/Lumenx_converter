/**
 * Timetable slots API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  ListTeacherAssignmentsParams,
  ListTimetableSlotsParams,
  TeacherAssignmentDto,
  TimetableSlotDto,
} from "./types";

export type PublishSectionTimetableResult = {
  sectionId: string;
  activatedCount: number;
};

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Timetable API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function listTimetableSlots(
  params: ListTimetableSlotsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TimetableSlotDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.academicYearId) query.set("academic_year_id", params.academicYearId);
  if (params.sectionId) query.set("section_id", params.sectionId);
  if (params.teacherId) query.set("teacher_id", params.teacherId);
  return client.get<TimetableSlotDto[]>(`/api/v1/timetable?${query.toString()}`);
}

export async function listTeacherAssignments(
  params: ListTeacherAssignmentsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TeacherAssignmentDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (params.sectionId && !isInstituteUuid(params.sectionId)) {
    throw new Error("section_id must be a valid UUID");
  }
  if (params.academicYearId && !isInstituteUuid(params.academicYearId)) {
    throw new Error("academic_year_id must be a valid UUID");
  }
  if (params.classId && !isInstituteUuid(params.classId)) {
    throw new Error("class_id must be a valid UUID");
  }

  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.academicYearId) query.set("academic_year_id", params.academicYearId);
  if (params.sectionId) query.set("section_id", params.sectionId);
  if (params.classId) query.set("class_id", params.classId);
  if (params.status) query.set("status", params.status);

  return client.get<TeacherAssignmentDto[]>(
    `/api/v1/timetable/assignments?${query.toString()}`,
  );
}

export async function publishSectionTimetable(
  params: { instituteId: string; sectionId: string },
  client: AdminApiClient = getAdminApiClient(),
): Promise<PublishSectionTimetableResult> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId) || !isInstituteUuid(params.sectionId)) {
    throw new Error("institute_id and section_id must be valid UUIDs");
  }
  return client.post<PublishSectionTimetableResult>(
    "/api/v1/timetable/publish-section",
    {
      institute_id: params.instituteId.trim(),
      section_id: params.sectionId.trim(),
    },
  );
}
