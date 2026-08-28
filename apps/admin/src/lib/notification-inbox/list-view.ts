/**
 * Pure helpers for API-mode notification inbox list validity.
 * Prevents painting institute A's rows under institute B before effects run.
 */
import type { NotificationInboxListItem } from "./types";
import type { NotificationInboxListStatus } from "./load";

export type NotificationInboxInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

export type ResolveNotificationInboxListViewInput = {
  apiMode: boolean;
  instituteStatus: NotificationInboxInstituteGateStatus;
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedItems: NotificationInboxListItem[];
  storedStatus: NotificationInboxListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type NotificationInboxListView = {
  status: NotificationInboxListStatus;
  items: NotificationInboxListItem[];
  errorMessage: string | null;
  rowsValid: boolean;
};

export function resolveNotificationInboxListView(
  input: ResolveNotificationInboxListViewInput,
): NotificationInboxListView {
  if (!input.apiMode) {
    return {
      status: "demo",
      items: input.storedItems,
      errorMessage: null,
      rowsValid: true,
    };
  }

  if (input.instituteStatus === "loading") {
    return {
      status: "loading",
      items: [],
      errorMessage: null,
      rowsValid: false,
    };
  }

  if (
    input.instituteStatus === "error" ||
    input.instituteStatus === "forbidden"
  ) {
    return {
      status: input.instituteStatus === "forbidden" ? "forbidden" : "error",
      items: [],
      errorMessage: input.instituteErrorMessage,
      rowsValid: false,
    };
  }

  if (
    input.instituteStatus === "needs_selection" ||
    input.instituteStatus === "empty" ||
    !input.activeInstituteId
  ) {
    return {
      status: "needs_institute",
      items: [],
      errorMessage: null,
      rowsValid: false,
    };
  }

  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return {
      status: "loading",
      items: [],
      errorMessage: null,
      rowsValid: false,
    };
  }

  return {
    status: input.storedStatus,
    items: input.storedItems,
    errorMessage: input.storedErrorMessage,
    rowsValid: true,
  };
}

export function shouldCommitNotificationInboxLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
