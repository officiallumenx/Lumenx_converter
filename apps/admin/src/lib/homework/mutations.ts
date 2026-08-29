/**
 * Homework write API — create / update / publish / expire / delete. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { HomeworkDto, HomeworkKind } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Homework API is only available in API auth mode");
  }
}

export type CreateHomeworkInput = {
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId?: string;
  kind: HomeworkKind;
  title: string;
  description: string;
  instructions?: string | null;
  dueDate: string;
};

export type UpdateHomeworkInput = {
  title?: string;
  description?: string;
  instructions?: string | null;
  dueDate?: string;
  kind?: HomeworkKind;
};

export async function createHomework(
  input: CreateHomeworkInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<HomeworkDto> {
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
  if (!isInstituteUuid(input.subjectId)) {
    throw new Error("subject_id must be a valid UUID");
  }
  if (input.teacherId !== undefined && !isInstituteUuid(input.teacherId)) {
    throw new Error("teacher_id must be a valid UUID");
  }
  return client.post<HomeworkDto>("/api/v1/homework", {
    institute_id: input.instituteId.trim(),
    academic_year_id: input.academicYearId.trim(),
    class_id: input.classId.trim(),
    section_id: input.sectionId.trim(),
    subject_id: input.subjectId.trim(),
    teacher_id: input.teacherId?.trim(),
    kind: input.kind,
    title: input.title.trim(),
    description: input.description.trim(),
    instructions: input.instructions,
    due_date: input.dueDate,
  });
}

export async function updateHomework(
  homeworkId: string,
  input: UpdateHomeworkInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<HomeworkDto> {
  assertApiMode();
  if (!isInstituteUuid(homeworkId)) {
    throw new Error("homework_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.title !== undefined) body.title = input.title.trim();
  if (input.description !== undefined) body.description = input.description.trim();
  if (input.instructions !== undefined) body.instructions = input.instructions;
  if (input.dueDate !== undefined) body.due_date = input.dueDate;
  if (input.kind !== undefined) body.kind = input.kind;
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<HomeworkDto>(
    `/api/v1/homework/${homeworkId.trim()}`,
    body,
  );
}

export async function publishHomework(
  homeworkId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<HomeworkDto> {
  assertApiMode();
  if (!isInstituteUuid(homeworkId)) {
    throw new Error("homework_id must be a valid UUID");
  }
  return client.post<HomeworkDto>(
    `/api/v1/homework/${homeworkId.trim()}/publish`,
  );
}

export async function expireHomework(
  homeworkId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<HomeworkDto> {
  assertApiMode();
  if (!isInstituteUuid(homeworkId)) {
    throw new Error("homework_id must be a valid UUID");
  }
  return client.post<HomeworkDto>(
    `/api/v1/homework/${homeworkId.trim()}/expire`,
  );
}

export async function deleteHomework(
  homeworkId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(homeworkId)) {
    throw new Error("homework_id must be a valid UUID");
  }
  await client.delete(`/api/v1/homework/${homeworkId.trim()}`);
}
