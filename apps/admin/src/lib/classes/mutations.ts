/**
 * Classes / sections write API — create / update / delete. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { ClassDto, ClassStatus, SectionDto, SectionStatus } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Classes API is only available in API auth mode");
  }
}

export type CreateClassInput = {
  instituteId: string;
  academicYearId: string;
  name: string;
  code: string;
  sortOrder?: number;
  status?: ClassStatus;
};

export type UpdateClassInput = {
  name?: string;
  code?: string;
  sortOrder?: number;
  status?: ClassStatus;
};

export type CreateSectionInput = {
  instituteId: string;
  academicYearId: string;
  classId: string;
  name: string;
  code: string;
  capacity?: number | null;
  room?: string | null;
  sortOrder?: number;
  status?: SectionStatus;
};

export type UpdateSectionInput = {
  name?: string;
  code?: string;
  capacity?: number | null;
  room?: string | null;
  sortOrder?: number;
  status?: SectionStatus;
};

export async function createClass(
  input: CreateClassInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ClassDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.academicYearId)) {
    throw new Error("academic_year_id must be a valid UUID");
  }
  return client.post<ClassDto>("/api/v1/classes", {
    institute_id: input.instituteId.trim(),
    academic_year_id: input.academicYearId.trim(),
    name: input.name.trim(),
    code: input.code.trim(),
    sort_order: input.sortOrder,
    status: input.status,
  });
}

export async function updateClass(
  classId: string,
  input: UpdateClassInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ClassDto> {
  assertApiMode();
  if (!isInstituteUuid(classId)) {
    throw new Error("class_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.code !== undefined) body.code = input.code.trim();
  if (input.sortOrder !== undefined) body.sort_order = input.sortOrder;
  if (input.status !== undefined) body.status = input.status;
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<ClassDto>(`/api/v1/classes/${classId.trim()}`, body);
}

export async function deleteClass(
  classId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(classId)) {
    throw new Error("class_id must be a valid UUID");
  }
  await client.delete(`/api/v1/classes/${classId.trim()}`);
}

export async function createSection(
  input: CreateSectionInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<SectionDto> {
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
  return client.post<SectionDto>("/api/v1/sections", {
    institute_id: input.instituteId.trim(),
    academic_year_id: input.academicYearId.trim(),
    class_id: input.classId.trim(),
    name: input.name.trim(),
    code: input.code.trim(),
    capacity: input.capacity,
    room: input.room,
    sort_order: input.sortOrder,
    status: input.status,
  });
}

export async function updateSection(
  sectionId: string,
  input: UpdateSectionInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<SectionDto> {
  assertApiMode();
  if (!isInstituteUuid(sectionId)) {
    throw new Error("section_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.code !== undefined) body.code = input.code.trim();
  if (input.capacity !== undefined) body.capacity = input.capacity;
  if (input.room !== undefined) body.room = input.room;
  if (input.sortOrder !== undefined) body.sort_order = input.sortOrder;
  if (input.status !== undefined) body.status = input.status;
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<SectionDto>(`/api/v1/sections/${sectionId.trim()}`, body);
}

export async function deleteSection(
  sectionId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(sectionId)) {
    throw new Error("section_id must be a valid UUID");
  }
  await client.delete(`/api/v1/sections/${sectionId.trim()}`);
}
