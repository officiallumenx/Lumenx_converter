import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type {
  AssetDto,
  CreateHomeworkInput,
  HomeworkDto,
  HomeworkSubmissionDto,
  LearnerHomeworkItemDto,
  ListHomeworkParams,
  TeacherHomeworkSheetDto,
  UpdateHomeworkInput,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Homework API is only available in API auth mode");
  }
}

function buildListQuery(params: ListHomeworkParams): string {
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.sectionId) query.set("section_id", params.sectionId);
  if (params.subjectId) query.set("subject_id", params.subjectId);
  if (params.teacherId) query.set("teacher_id", params.teacherId);
  if (params.status) query.set("status", params.status);
  if (params.kind) query.set("kind", params.kind);
  return query.toString();
}

export async function listHomework(
  params: ListHomeworkParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<HomeworkDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.get<HomeworkDto[]>(`/api/v1/homework?${buildListQuery(params)}`);
}

export async function getHomework(
  homeworkId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<HomeworkDto> {
  assertApiMode();
  if (!isInstituteUuid(homeworkId)) {
    throw new Error("homework_id must be a valid UUID");
  }
  return client.get<HomeworkDto>(`/api/v1/homework/${homeworkId.trim()}`);
}

export async function createHomework(
  input: CreateHomeworkInput,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<HomeworkDto> {
  assertApiMode();
  return client.post<HomeworkDto>("/api/v1/homework", {
    institute_id: input.instituteId,
    academic_year_id: input.academicYearId,
    class_id: input.classId,
    section_id: input.sectionId,
    subject_id: input.subjectId,
    kind: input.kind,
    title: input.title,
    description: input.description,
    instructions: input.instructions,
    due_date: input.dueDate,
  });
}

export async function updateHomework(
  homeworkId: string,
  input: UpdateHomeworkInput,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<HomeworkDto> {
  assertApiMode();
  return client.patch<HomeworkDto>(`/api/v1/homework/${homeworkId.trim()}`, {
    title: input.title,
    description: input.description,
    instructions: input.instructions,
    due_date: input.dueDate,
    kind: input.kind,
    attachment_asset_id: input.attachmentAssetId,
  });
}

export async function publishHomework(
  homeworkId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<HomeworkDto> {
  assertApiMode();
  return client.post<HomeworkDto>(`/api/v1/homework/${homeworkId.trim()}/publish`, {});
}

export async function expireHomework(
  homeworkId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<HomeworkDto> {
  assertApiMode();
  return client.post<HomeworkDto>(`/api/v1/homework/${homeworkId.trim()}/expire`, {});
}

export async function getStudentHomeworkItems(
  params: { instituteId: string; studentId: string; kind?: "homework" | "assignment" },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<LearnerHomeworkItemDto[]> {
  assertApiMode();
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.kind) query.set("kind", params.kind);
  return client.get<LearnerHomeworkItemDto[]>(
    `/api/v1/homework/portal/students/${params.studentId.trim()}/items?${query.toString()}`,
  );
}

export async function getTeacherHomeworkSheet(
  params: { instituteId: string; homeworkId: string },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<TeacherHomeworkSheetDto> {
  assertApiMode();
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<TeacherHomeworkSheetDto>(
    `/api/v1/homework/portal/teacher/${params.homeworkId.trim()}/sheet?${query.toString()}`,
  );
}

export async function updateHomeworkSubmission(
  submissionId: string,
  status: "missing" | "submitted",
  client: ConnectApiClient = getConnectApiClient(),
): Promise<HomeworkSubmissionDto> {
  assertApiMode();
  return client.patch<HomeworkSubmissionDto>(
    `/api/v1/homework/submissions/${submissionId.trim()}`,
    { status },
  );
}

export async function uploadHomeworkPdf(
  input: { instituteId: string; file: File; homeworkId?: string },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AssetDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const form = new FormData();
  form.set("institute_id", input.instituteId.trim());
  form.set("bucket", "generated-documents");
  form.set("category", "other");
  form.set("file", input.file);
  form.set("visibility", "institute");
  if (input.homeworkId) {
    form.set("linked_entity_kind", "other");
    form.set("linked_entity_id", input.homeworkId);
  }
  return client.uploadForm<AssetDto>("/api/v1/assets/upload", form);
}

export async function getAssetSignedUrl(
  assetId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<{ signedUrl: string; expiresAt: string }> {
  assertApiMode();
  return client.get<{ signedUrl: string; expiresAt: string }>(
    `/api/v1/assets/${assetId.trim()}/signed-url`,
  );
}
