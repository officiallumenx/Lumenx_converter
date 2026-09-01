import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listParents } from "@/lib/parents/api";
import { listStudents } from "@/lib/students/api";
import { listTeachers } from "@/lib/teachers/api";
import { listMessageThreads } from "./api";
import { buildUserNameLookup, enrichThreadListItems } from "./enrich";
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

export async function loadMessagesThreadList(
  activeInstituteId: string | null,
  currentUserId?: string | null,
): Promise<MessagesListState> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", items: [], errorMessage: null };
  }

  try {
    const [dtos, teachers, parents, students] = await Promise.all([
      listMessageThreads({ instituteId: activeInstituteId }),
      listTeachers({ instituteId: activeInstituteId }).catch(() => []),
      listParents({ instituteId: activeInstituteId }).catch(() => []),
      listStudents({ instituteId: activeInstituteId }).catch(() => []),
    ]);

    const lookup = buildUserNameLookup(teachers, parents, students);
    const items = currentUserId
      ? enrichThreadListItems(dtos, lookup, currentUserId)
      : threadDtosToListItems(dtos);

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
