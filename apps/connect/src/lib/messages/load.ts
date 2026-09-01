import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import { listMessageRecipients, listMessageThreads } from "./api";
import { threadDtosToListItems } from "./map";
import type { MessageThreadListItem } from "./types";

export type MessagesListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type MessagesListState = {
  status: MessagesListStatus;
  items: MessageThreadListItem[];
  errorMessage: string | null;
};

export async function loadMessagesThreadList(input: {
  instituteId: string | null;
  currentUserId: string | null;
  studentId?: string | null;
}): Promise<MessagesListState> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }

  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return { status: "needs_institute", items: [], errorMessage: null };
  }

  if (!input.currentUserId) {
    return { status: "error", items: [], errorMessage: "User session required" };
  }

  try {
    const [dtos, recipients] = await Promise.all([
      listMessageThreads({ instituteId: input.instituteId }),
      listMessageRecipients({
        instituteId: input.instituteId,
        studentId: input.studentId,
      }).catch(() => []),
    ]);

    const recipientByUserId = new Map(recipients.map((r) => [r.userId, r]));
    const items = threadDtosToListItems(dtos, recipientByUserId, input.currentUserId);

    return {
      status: items.length === 0 ? "empty" : "ready",
      items,
      errorMessage: null,
    };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message =
      err instanceof Error ? err.message : "Failed to load message threads";
    if (status === 403) {
      return { status: "forbidden", items: [], errorMessage: message };
    }
    return { status: "error", items: [], errorMessage: message };
  }
}
