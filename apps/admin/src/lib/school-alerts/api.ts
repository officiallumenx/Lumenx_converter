/**
 * School alerts broadcast API — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  AdminSchoolAlertDto,
  BroadcastSchoolAlertInput,
  BroadcastSchoolAlertResult,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("School alerts API is only available in API auth mode");
  }
}

export async function listRecentSchoolAlerts(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AdminSchoolAlertDto[]> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams({ institute_id: instituteId.trim() });
  return client.get<AdminSchoolAlertDto[]>(
    `/api/v1/school-alerts/recent?${query.toString()}`,
  );
}

export async function broadcastSchoolAlert(
  input: BroadcastSchoolAlertInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<BroadcastSchoolAlertResult> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<BroadcastSchoolAlertResult>("/api/v1/school-alerts/broadcast", {
    institute_id: input.instituteId.trim(),
    title: input.title.trim(),
    summary: input.summary?.trim() || undefined,
    detail: input.detail?.trim() || undefined,
    severity: input.severity,
    category: input.category,
    source_label: input.sourceLabel?.trim() || undefined,
    student_id: input.studentId ?? undefined,
    audience: input.audience,
  });
}
