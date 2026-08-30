/**
 * Staff attendance write API — day upsert / submit / reopen / delete.
 * API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { StaffAttendanceDto, StaffAttendanceStatus } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Staff attendance API is only available in API auth mode");
  }
}

export type StaffAttendanceDayMarkInput = {
  teacherId: string;
  status: StaffAttendanceStatus;
  checkIn?: string | null;
  checkOut?: string | null;
  note?: string | null;
};

export type UpsertStaffAttendanceDayInput = {
  instituteId: string;
  date: string;
  marks: StaffAttendanceDayMarkInput[];
};

export type StaffAttendanceDayActionInput = {
  instituteId: string;
  date: string;
};

export async function upsertStaffAttendanceDay(
  input: UpsertStaffAttendanceDayInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<StaffAttendanceDto[]> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (input.marks.length === 0) {
    throw new Error("marks must not be empty");
  }
  for (const mark of input.marks) {
    if (!isInstituteUuid(mark.teacherId)) {
      throw new Error("teacher_id must be a valid UUID");
    }
  }
  return client.put<StaffAttendanceDto[]>("/api/v1/staff-attendance/day", {
    institute_id: input.instituteId.trim(),
    date: input.date,
    marks: input.marks.map((mark) => ({
      teacher_id: mark.teacherId.trim(),
      status: mark.status,
      check_in: mark.checkIn,
      check_out: mark.checkOut,
      note: mark.note,
    })),
  });
}

export async function submitStaffAttendanceDay(
  input: StaffAttendanceDayActionInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<StaffAttendanceDto[]> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<StaffAttendanceDto[]>(
    "/api/v1/staff-attendance/day/submit",
    {
      institute_id: input.instituteId.trim(),
      date: input.date,
    },
  );
}

export async function reopenStaffAttendanceDay(
  input: StaffAttendanceDayActionInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<StaffAttendanceDto[]> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<StaffAttendanceDto[]>(
    "/api/v1/staff-attendance/day/reopen",
    {
      institute_id: input.instituteId.trim(),
      date: input.date,
    },
  );
}

export async function deleteStaffAttendance(
  attendanceId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(attendanceId)) {
    throw new Error("attendance_id must be a valid UUID");
  }
  await client.delete(`/api/v1/staff-attendance/${attendanceId.trim()}`);
}
