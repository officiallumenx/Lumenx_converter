import { getNexusApiClient } from "@/lib/nexus-api";
import { isNexusApiMode } from "@/lib/auth-mode";
import type { NexusApiClient } from "@/lib/api";
import type {
  SupportCategory,
  SupportMessageDto,
  SupportPriority,
  SupportStatus,
  SupportThreadDto,
} from "./types";

function assertApiMode(): void {
  if (!isNexusApiMode()) {
    throw new Error("Nexus support API is only available in API auth mode");
  }
}

export async function listSupportThreadsApi(
  params: {
    instituteId?: string;
    status?: SupportStatus;
    category?: SupportCategory;
  } = {},
  client: NexusApiClient = getNexusApiClient(),
): Promise<SupportThreadDto[]> {
  assertApiMode();
  const query = new URLSearchParams();
  if (params.instituteId) query.set("institute_id", params.instituteId);
  if (params.status) query.set("status", params.status);
  if (params.category) query.set("category", params.category);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return client.get<SupportThreadDto[]>(`/api/nexus/support/threads${suffix}`);
}

export async function getSupportThreadApi(
  id: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<SupportThreadDto> {
  assertApiMode();
  return client.get<SupportThreadDto>(`/api/nexus/support/threads/${id}`);
}

export async function createSupportThreadApi(
  input: {
    instituteId: string;
    subject: string;
    category?: SupportCategory;
    priority?: SupportPriority;
    body: string;
  },
  client: NexusApiClient = getNexusApiClient(),
): Promise<SupportThreadDto> {
  assertApiMode();
  return client.post<SupportThreadDto>("/api/nexus/support/threads", {
    institute_id: input.instituteId,
    subject: input.subject,
    category: input.category,
    priority: input.priority,
    body: input.body,
  });
}

export async function updateSupportThreadApi(
  id: string,
  input: {
    status?: SupportStatus;
    priority?: SupportPriority;
    assigneeHandle?: string | null;
  },
  client: NexusApiClient = getNexusApiClient(),
): Promise<SupportThreadDto> {
  assertApiMode();
  return client.patch<SupportThreadDto>(`/api/nexus/support/threads/${id}`, {
    status: input.status,
    priority: input.priority,
    assignee_handle: input.assigneeHandle,
  });
}

export async function replySupportThreadApi(
  id: string,
  body: string,
  authorLabel?: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<SupportMessageDto> {
  assertApiMode();
  return client.post<SupportMessageDto>(`/api/nexus/support/threads/${id}/messages`, {
    body,
    author_label: authorLabel,
  });
}

export async function noteSupportThreadApi(
  id: string,
  body: string,
  authorLabel?: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<SupportMessageDto> {
  assertApiMode();
  return client.post<SupportMessageDto>(`/api/nexus/support/threads/${id}/notes`, {
    body,
    author_label: authorLabel,
  });
}
