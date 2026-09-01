/**
 * Messages API — institute staff inbox (teacher / parent threads).
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  CreateDirectThreadInput,
  CreateGroupThreadInput,
  ListMessageThreadsParams,
  ListRecipientsParams,
  MessageDto,
  MessageRecipientDto,
  MessageThreadDto,
  UpdateThreadInput,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Messages API is only available in API auth mode");
  }
}

export async function listMessageThreads(
  params: ListMessageThreadsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MessageThreadDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<MessageThreadDto[]>(
    `/api/v1/messages/threads?${query.toString()}`,
  );
}

export async function getMessageThread(
  threadId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MessageThreadDto> {
  assertApiMode();
  return client.get<MessageThreadDto>(`/api/v1/messages/threads/${threadId}`);
}

export async function listMessageRecipients(
  params: ListRecipientsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MessageRecipientDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.studentId) {
    query.set("student_id", params.studentId.trim());
  }
  return client.get<MessageRecipientDto[]>(
    `/api/v1/messages/recipients?${query.toString()}`,
  );
}

export async function createDirectThread(
  input: CreateDirectThreadInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MessageThreadDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<MessageThreadDto>("/api/v1/messages/threads", {
    institute_id: input.instituteId.trim(),
    counterpart_user_id: input.counterpartUserId.trim(),
    subject: input.subject ?? null,
    student_id: input.studentId ?? null,
    body: input.body ?? null,
  });
}

export async function createGroupThread(
  input: CreateGroupThreadInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MessageThreadDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<MessageThreadDto>("/api/v1/messages/threads/group", {
    institute_id: input.instituteId.trim(),
    subject: input.subject ?? null,
    class_label: input.classLabel.trim(),
    section_label: input.sectionLabel.trim(),
    body: input.body ?? null,
  });
}

export async function updateMessageThread(
  threadId: string,
  input: UpdateThreadInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MessageThreadDto> {
  assertApiMode();
  return client.patch<MessageThreadDto>(`/api/v1/messages/threads/${threadId}`, {
    subject: input.subject,
    status: input.status,
  });
}

export async function listThreadMessages(
  threadId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MessageDto[]> {
  assertApiMode();
  return client.get<MessageDto[]>(`/api/v1/messages/threads/${threadId}/messages`);
}

export async function sendThreadMessage(
  threadId: string,
  body: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MessageDto> {
  assertApiMode();
  return client.post<MessageDto>(`/api/v1/messages/threads/${threadId}/messages`, {
    body,
  });
}

export async function markMessageRead(
  messageId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MessageDto> {
  assertApiMode();
  return client.patch<MessageDto>(`/api/v1/messages/messages/${messageId}`, {
    read: true,
  });
}
