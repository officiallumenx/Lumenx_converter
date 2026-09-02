import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type {
  AttendanceConfigDto,
  AttendanceMarkStatus,
  AttendanceRegisterDto,
  PortalLearnerAttendanceDto,
  PortalTeacherAttendanceDto,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Attendance API is only available in API auth mode");
  }
}

export async function getLearnerAttendancePortal(
  params: {
    instituteId: string;
    studentId: string;
    fromDate?: string;
    toDate?: string;
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<PortalLearnerAttendanceDto> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId) || !isInstituteUuid(params.studentId)) {
    throw new Error("institute_id and student_id must be valid UUIDs");
  }
  const query = new URLSearchParams({ institute_id: params.instituteId.trim() });
  if (params.fromDate) query.set("from_date", params.fromDate);
  if (params.toDate) query.set("to_date", params.toDate);
  return client.get<PortalLearnerAttendanceDto>(
    `/api/v1/attendance/portal/students/${params.studentId.trim()}?${query.toString()}`,
  );
}

export async function getTeacherAttendancePortal(
  params: { instituteId: string; sectionId: string; attendanceDate: string },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<PortalTeacherAttendanceDto> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId) || !isInstituteUuid(params.sectionId)) {
    throw new Error("institute_id and section_id must be valid UUIDs");
  }
  const query = new URLSearchParams({
    institute_id: params.instituteId.trim(),
    section_id: params.sectionId.trim(),
    attendance_date: params.attendanceDate,
  });
  return client.get<PortalTeacherAttendanceDto>(
    `/api/v1/attendance/portal/teacher?${query.toString()}`,
  );
}

export async function listAttendanceConfig(
  params: { instituteId: string },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AttendanceConfigDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams({ institute_id: params.instituteId.trim() });
  return client.get<AttendanceConfigDto[]>(
    `/api/v1/attendance/config?${query.toString()}`,
  );
}

export async function listAttendanceRegisters(
  params: {
    instituteId: string;
    sectionId?: string;
    attendanceDate?: string;
    status?: "draft" | "submitted";
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AttendanceRegisterDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams({ institute_id: params.instituteId.trim() });
  if (params.sectionId) query.set("section_id", params.sectionId);
  if (params.attendanceDate) query.set("attendance_date", params.attendanceDate);
  if (params.status) query.set("status", params.status);
  return client.get<AttendanceRegisterDto[]>(
    `/api/v1/attendance/registers?${query.toString()}`,
  );
}

export async function getAttendanceRegister(
  registerId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AttendanceRegisterDto> {
  assertApiMode();
  if (!isInstituteUuid(registerId)) {
    throw new Error("register_id must be a valid UUID");
  }
  return client.get<AttendanceRegisterDto>(
    `/api/v1/attendance/registers/${registerId.trim()}`,
  );
}

export type AttendanceMarkInput = {
  enrollmentId: string;
  status: AttendanceMarkStatus;
};

export async function createAttendanceRegister(
  input: {
    instituteId: string;
    academicYearId: string;
    classId: string;
    sectionId: string;
    configVersionId: string;
    attendanceDate: string;
    slotKind: AttendanceRegisterDto["slotKind"];
    slotCode: string;
    periodIndex?: number | null;
    timetableSlotId?: string | null;
    slotLabel: string;
    subjectLabel?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    marks: AttendanceMarkInput[];
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AttendanceRegisterDto> {
  assertApiMode();
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
  input: {
    marks?: AttendanceMarkInput[];
    slotLabel?: string;
    subjectLabel?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    periodIndex?: number | null;
    timetableSlotId?: string | null;
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AttendanceRegisterDto> {
  assertApiMode();
  const body: Record<string, unknown> = {};
  if (input.slotLabel !== undefined) body.slot_label = input.slotLabel;
  if (input.subjectLabel !== undefined) body.subject_label = input.subjectLabel;
  if (input.startsAt !== undefined) body.starts_at = input.startsAt;
  if (input.endsAt !== undefined) body.ends_at = input.endsAt;
  if (input.periodIndex !== undefined) body.period_index = input.periodIndex;
  if (input.timetableSlotId !== undefined) {
    body.timetable_slot_id = input.timetableSlotId;
  }
  if (input.marks) {
    body.marks = input.marks.map((m) => ({
      enrollment_id: m.enrollmentId,
      status: m.status,
    }));
  }
  return client.patch<AttendanceRegisterDto>(
    `/api/v1/attendance/registers/${registerId.trim()}`,
    body,
  );
}

export async function submitAttendanceRegister(
  registerId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AttendanceRegisterDto> {
  assertApiMode();
  return client.post<AttendanceRegisterDto>(
    `/api/v1/attendance/registers/${registerId.trim()}/submit`,
  );
}
