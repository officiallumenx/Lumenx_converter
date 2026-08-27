/**
 * Dual-mode announcements list loader.
 * Demo: never calls API (caller keeps INITIAL).
 * API: requires validated institute UUID; no demo fallback on failure.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listAnnouncements } from "./api";
import { announcementDtosToListItems } from "./map";
import type { AnnouncementListItem } from "./types";

export type AnnouncementsListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type AnnouncementsListState = {
  status: AnnouncementsListStatus;
  items: AnnouncementListItem[];
  errorMessage: string | null;
};

export async function loadAnnouncementsList(
  activeInstituteId: string | null,
): Promise<AnnouncementsListState> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      items: [],
      errorMessage: null,
    };
  }

  try {
    const dtos = await listAnnouncements({ instituteId: activeInstituteId });
    const items = announcementDtosToListItems(dtos);
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
      err instanceof Error ? err.message : "Failed to load announcements";

    if (status === 403) {
      return {
        status: "forbidden",
        items: [],
        errorMessage: message,
      };
    }
    // 401: client unauthorized handler clears session; still no demo fallback.
    return {
      status: "error",
      items: [],
      errorMessage: message,
    };
  }
}
