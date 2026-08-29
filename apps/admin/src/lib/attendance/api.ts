import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  AttendanceRegisterDto,
  ListAttendanceRegistersParams,
  ListAttendanceConfigParams,
  AttendanceConfigDto,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Attendance API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function listAttendanceRegisters(
  params: ListAttendanceRegistersParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AttendanceRegisterDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.academicYearId) query.set("academic_year_id", params.academicYearId);
  if (params.sectionId) query.set("section_id", params.sectionId);
  if (params.attendanceDate) query.set("attendance_date", params.attendanceDate);
  if (params.status) query.set("status", params.status);
  return client.get<AttendanceRegisterDto[]>(
    `/api/v1/attendance/registers?${query.toString()}`,
  );
}

export async function getAttendanceRegister(
  registerId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AttendanceRegisterDto> {
  assertApiMode();
  if (!isInstituteUuid(registerId)) {
    throw new Error("register_id must be a valid UUID");
  }
  return client.get<AttendanceRegisterDto>(
    `/api/v1/attendance/registers/${registerId.trim()}`,
  );
}

export async function listAttendanceConfig(
  params: ListAttendanceConfigParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AttendanceConfigDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<AttendanceConfigDto[]>(
    `/api/v1/attendance/config?${query.toString()}`,
  );
}
