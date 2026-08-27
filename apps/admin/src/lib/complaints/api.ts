/**
 * Complaints API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { ComplaintDto, ListComplaintsParams } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Complaints API is only available in API auth mode");
  }
}

export async function listComplaints(
  params: ListComplaintsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ComplaintDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.status) query.set("status", params.status);
  if (params.destination) query.set("destination", params.destination);
  if (params.priority) query.set("priority", params.priority);
  if (params.studentId) query.set("student_id", params.studentId);
  if (params.teacherId) query.set("teacher_id", params.teacherId);

  return client.get<ComplaintDto[]>(
    `/api/v1/complaints?${query.toString()}`,
  );
}
