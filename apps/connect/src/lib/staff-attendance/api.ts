import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type { ListStaffAttendanceParams, StaffAttendanceDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Staff attendance API is only available in API auth mode");
  }
}

export async function listStaffAttendance(
  params: ListStaffAttendanceParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<StaffAttendanceDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.date) query.set("date", params.date);
  if (params.teacherId) query.set("teacher_id", params.teacherId.trim());
  if (params.dayStatus) query.set("day_status", params.dayStatus);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return client.get<StaffAttendanceDto[]>(
    `/api/v1/staff-attendance?${query.toString()}`,
  );
}
