/**
 * Notification inbox write API — mark read/star / delete / emit. API auth mode only.
 * Template CRUD is not available on the backend.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  BackendNotificationCategory,
  BackendNotificationPriority,
  InboxItemDto,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Notifications API is only available in API auth mode");
  }
}

export type UpdateInboxItemInput = {
  read?: boolean;
  starred?: boolean;
};

/** Role audiences resolved server-side from active institute memberships. */
export type NotificationAudience =
  | "everyone"
  | "students"
  | "parents"
  | "teachers";

export type EmitNotificationInput = {
  instituteId: string;
  templateId?: string | null;
  category: BackendNotificationCategory;
  priority?: BackendNotificationPriority;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  deepLink?: string | null;
  dedupeKey?: string | null;
  /** Explicit user profile UUIDs XOR audience. */
  recipientUserIds?: string[];
  audience?: NotificationAudience;
};

export async function updateInboxItem(
  itemId: string,
  input: UpdateInboxItemInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<InboxItemDto> {
  assertApiMode();
  if (!isInstituteUuid(itemId)) {
    throw new Error("item_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.read !== undefined) body.read = input.read;
  if (input.starred !== undefined) body.starred = input.starred;
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<InboxItemDto>(
    `/api/v1/notifications/${itemId.trim()}`,
    body,
  );
}

export async function deleteInboxItem(
  itemId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(itemId)) {
    throw new Error("item_id must be a valid UUID");
  }
  await client.delete(`/api/v1/notifications/${itemId.trim()}`);
}

export async function emitNotification(
  input: EmitNotificationInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<unknown> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  const hasIds = Boolean(input.recipientUserIds?.length);
  const hasAudience = Boolean(input.audience);
  if (hasIds === hasAudience) {
    throw new Error(
      "Provide either recipient_user_ids or audience (not both, not neither)",
    );
  }

  if (input.recipientUserIds) {
    for (const id of input.recipientUserIds) {
      if (!isInstituteUuid(id)) {
        throw new Error("recipient_user_ids must be valid UUIDs");
      }
    }
  }

  if (
    input.templateId != null &&
    input.templateId !== "" &&
    !isInstituteUuid(input.templateId)
  ) {
    throw new Error("template_id must be a valid UUID");
  }

  const body: Record<string, unknown> = {
    institute_id: input.instituteId.trim(),
    template_id: input.templateId,
    category: input.category,
    priority: input.priority,
    title: input.title.trim(),
    body: input.body.trim(),
    payload: input.payload,
    deep_link: input.deepLink,
    dedupe_key: input.dedupeKey,
  };
  if (input.audience) {
    body.audience = input.audience;
  } else {
    body.recipient_user_ids = input.recipientUserIds;
  }

  return client.post("/api/v1/notifications", body);
}
