/**
 * Timetable slots API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { ListTimetableSlotsParams, TimetableSlotDto } from "./types";

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
