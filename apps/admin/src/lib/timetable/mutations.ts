/**
 * Timetable write API — create / update / delete slots. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { TimetableSlotDto, TimetableSlotStatus } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Timetable API is only available in API auth mode");
  }
}

export type CreateTimetableSlotInput = {
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  teacherAssignmentId: string;
  dayOfWeek: number;
  periodIndex: number;
  startsAt: string;
  endsAt: string;
  room?: string | null;
  status?: TimetableSlotStatus;
};

export type UpdateTimetableSlotInput = {
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  teacherAssignmentId?: string;
  dayOfWeek?: number;
  periodIndex?: number;
  startsAt?: string;
  endsAt?: string;
  room?: string | null;
  status?: TimetableSlotStatus;
};

export async function createTimetableSlot(
  input: CreateTimetableSlotInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TimetableSlotDto> {
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
  if (!isInstituteUuid(input.teacherAssignmentId)) {
    throw new Error("teacher_assignment_id must be a valid UUID");
  }
  return client.post<TimetableSlotDto>("/api/v1/timetable", {
    institute_id: input.instituteId.trim(),
    academic_year_id: input.academicYearId.trim(),
    class_id: input.classId.trim(),
    section_id: input.sectionId.trim(),
    teacher_assignment_id: input.teacherAssignmentId.trim(),
    day_of_week: input.dayOfWeek,
    period_index: input.periodIndex,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    room: input.room,
    status: input.status,
  });
}

export async function updateTimetableSlot(
  slotId: string,
  input: UpdateTimetableSlotInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TimetableSlotDto> {
  assertApiMode();
  if (!isInstituteUuid(slotId)) {
    throw new Error("slot_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.academicYearId !== undefined) {
    body.academic_year_id = input.academicYearId.trim();
  }
  if (input.classId !== undefined) body.class_id = input.classId.trim();
  if (input.sectionId !== undefined) body.section_id = input.sectionId.trim();
  if (input.teacherAssignmentId !== undefined) {
    body.teacher_assignment_id = input.teacherAssignmentId.trim();
  }
  if (input.dayOfWeek !== undefined) body.day_of_week = input.dayOfWeek;
  if (input.periodIndex !== undefined) body.period_index = input.periodIndex;
  if (input.startsAt !== undefined) body.starts_at = input.startsAt;
  if (input.endsAt !== undefined) body.ends_at = input.endsAt;
  if (input.room !== undefined) body.room = input.room;
  if (input.status !== undefined) body.status = input.status;
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<TimetableSlotDto>(
    `/api/v1/timetable/${slotId.trim()}`,
    body,
  );
}

export async function deleteTimetableSlot(
  slotId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(slotId)) {
    throw new Error("slot_id must be a valid UUID");
  }
  await client.delete(`/api/v1/timetable/${slotId.trim()}`);
}
