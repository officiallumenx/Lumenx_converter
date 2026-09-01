import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Notifications API is only available in API auth mode");
  }
}

export type EmitNotificationInput = {
  instituteId: string;
  category: "messages" | "announcements" | "system";
  title: string;
  body: string;
  recipientUserIds: string[];
  deepLink?: string | null;
  dedupeKey?: string | null;
  payload?: Record<string, unknown>;
};

export async function emitNotification(
  input: EmitNotificationInput,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (input.recipientUserIds.length === 0) return;

  await client.post("/api/v1/notifications", {
    institute_id: input.instituteId.trim(),
    category: input.category,
    priority: "normal",
    title: input.title.trim(),
    body: input.body.trim(),
    recipient_user_ids: input.recipientUserIds,
    deep_link: input.deepLink ?? null,
    dedupe_key: input.dedupeKey ?? null,
    payload: input.payload,
  });
}
