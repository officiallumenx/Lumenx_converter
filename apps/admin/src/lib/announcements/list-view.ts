/**
 * Pure helpers for API-mode announcements list validity.
 * Prevents painting institute A's rows under institute B before effects run.
 */
import type { AnnouncementListItem } from "./types";
import type { AnnouncementsListStatus } from "./load";

/** Institute context statuses that must not show prior API announcement rows. */
export type AnnouncementsInstituteGateStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_selection"
  | "empty"
  | "forbidden"
  | "error";

export type ResolveAnnouncementsListViewInput = {
  apiMode: boolean;
  instituteStatus: AnnouncementsInstituteGateStatus;
  activeInstituteId: string | null;
  /** Institute id for which storedItems/storedStatus were last committed. */
  resolvedForInstituteId: string | null;
  storedItems: AnnouncementListItem[];
  storedStatus: AnnouncementsListStatus;
  storedErrorMessage: string | null;
  instituteErrorMessage: string | null;
};

export type AnnouncementsListView = {
  status: AnnouncementsListStatus;
  items: AnnouncementListItem[];
  errorMessage: string | null;
  /** True when stored API rows may be shown for the current institute. */
  rowsValid: boolean;
};

/**
 * Render-time resolution: never surfaces stored rows when they belong to
 * another institute or when institute context is blocking/non-ready.
 */
export function resolveAnnouncementsListView(
  input: ResolveAnnouncementsListViewInput,
): AnnouncementsListView {
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

  // Check error/forbidden before !activeInstituteId — context clears the id on those states.
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

  // Institute context is ready (or equivalent) with an active id.
  // Rows are only valid when they were resolved for that exact institute.
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

/**
 * Guard for applying an async list response. Survives institute switches even
 * if a caller forgets the cancelled flag (belt-and-suspenders with cleanup).
 */
export function shouldCommitAnnouncementsLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
