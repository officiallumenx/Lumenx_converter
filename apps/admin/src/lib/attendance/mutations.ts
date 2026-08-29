/**
 * Attendance write API — config create, register create/update/submit.
 * API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  AttendanceConfigDto,
  AttendanceConfigScope,
  AttendanceMarkStatus,
  AttendanceMethod,
  AttendanceOwner,
  AttendanceRegisterDto,
  AttendanceSlotKind,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Attendance API is only available in API auth mode");
  }
}

export type CreateAttendanceConfigInput = {
  instituteId: string;
  effectiveFrom: string;
  method: AttendanceMethod;
  owner: AttendanceOwner;
  scope: AttendanceConfigScope;
  classCodes?: string[];
  sectionCodes?: string[];
};

export type AttendanceMarkInput = {
  enrollmentId: string;
  status: AttendanceMarkStatus;
};

export type CreateAttendanceRegisterInput = {
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  configVersionId: string;
  attendanceDate: string;
  slotKind: AttendanceSlotKind;
  slotCode: string;
  periodIndex?: number | null;
  timetableSlotId?: string | null;
  slotLabel: string;
  subjectLabel?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  marks: AttendanceMarkInput[];
};

export type UpdateAttendanceRegisterInput = {
  slotLabel?: string;
  subjectLabel?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  periodIndex?: number | null;
  timetableSlotId?: string | null;
  marks?: AttendanceMarkInput[];
};

export async function createAttendanceConfig(
  input: CreateAttendanceConfigInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AttendanceConfigDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<AttendanceConfigDto>("/api/v1/attendance/config", {
    institute_id: input.instituteId.trim(),
    effective_from: input.effectiveFrom,
    method: input.method,
    owner: input.owner,
    scope: input.scope,
    class_codes: input.classCodes,
    section_codes: input.sectionCodes,
  });
}

export async function createAttendanceRegister(
  input: CreateAttendanceRegisterInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AttendanceRegisterDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.academicYearId)) {
    throw new Error("academic_year_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.classId)) {
    throw new Error("class_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.sectionId)) {
    throw new Error("section_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.configVersionId)) {
    throw new Error("config_version_id must be a valid UUID");
  }
  return client.post<AttendanceRegisterDto>("/api/v1/attendance/registers", {
    institute_id: input.instituteId.trim(),
    academic_year_id: input.academicYearId.trim(),
    class_id: input.classId.trim(),
    section_id: input.sectionId.trim(),
    config_version_id: input.configVersionId.trim(),
    attendance_date: input.attendanceDate,
    slot_kind: input.slotKind,
    slot_code: input.slotCode,
    period_index: input.periodIndex,
    timetable_slot_id: input.timetableSlotId,
    slot_label: input.slotLabel,
    subject_label: input.subjectLabel,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    marks: input.marks.map((m) => ({
      enrollment_id: m.enrollmentId,
      status: m.status,
    })),
  });
}

export async function updateAttendanceRegister(
  registerId: string,
  input: UpdateAttendanceRegisterInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AttendanceRegisterDto> {
  assertApiMode();
  if (!isInstituteUuid(registerId)) {
    throw new Error("register_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.slotLabel !== undefined) body.slot_label = input.slotLabel;
  if (input.subjectLabel !== undefined) body.subject_label = input.subjectLabel;
  if (input.startsAt !== undefined) body.starts_at = input.startsAt;
  if (input.endsAt !== undefined) body.ends_at = input.endsAt;
  if (input.periodIndex !== undefined) body.period_index = input.periodIndex;
  if (input.timetableSlotId !== undefined) {
    body.timetable_slot_id = input.timetableSlotId;
  }
  if (input.marks !== undefined) {
    body.marks = input.marks.map((m) => ({
      enrollment_id: m.enrollmentId,
      status: m.status,
    }));
  }
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<AttendanceRegisterDto>(
    `/api/v1/attendance/registers/${registerId.trim()}`,
    body,
  );
}

export async function submitAttendanceRegister(
  registerId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<AttendanceRegisterDto> {
  assertApiMode();
  if (!isInstituteUuid(registerId)) {
    throw new Error("register_id must be a valid UUID");
  }
  return client.post<AttendanceRegisterDto>(
    `/api/v1/attendance/registers/${registerId.trim()}/submit`,
  );
}
