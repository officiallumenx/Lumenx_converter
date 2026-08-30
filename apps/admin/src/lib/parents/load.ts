/**
 * Dual-mode parents directory list loader.
 * Demo: never calls API (caller keeps demo seed/store).
 * API: requires validated institute UUID; no demo fallback on failure.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listParents, getParent } from "./api";
import { parentDtosToListItems, parentDtoToDetailItem } from "./map";
import type { ParentDetailItem, ParentListItem } from "./types";

export type ParentsListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type ParentsListState = {
  status: ParentsListStatus;
  items: ParentListItem[];
  errorMessage: string | null;
};

export type ParentDetailState = {
  status: ParentsListStatus;
  parent: ParentDetailItem | null;
  errorMessage: string | null;
};

export async function loadParentDetail(
  parentId: string,
  activeInstituteId: string | null = null,
): Promise<ParentDetailState> {
  if (!isApiAuthMode()) {
    return { status: "demo", parent: null, errorMessage: null };
  }

  if (!parentId?.trim()) {
    return { status: "error", parent: null, errorMessage: "Parent id is required." };
  }

  if (!isInstituteUuid(parentId.trim())) {
    return {
      status: "error",
      parent: null,
      errorMessage: "Parent id must be a valid UUID.",
    };
  }

  try {
    const dto = await getParent(parentId.trim());
    if (
      activeInstituteId &&
      isInstituteUuid(activeInstituteId) &&
      dto.instituteId !== activeInstituteId
    ) {
      return {
        status: "empty",
        parent: null,
        errorMessage: "Parent not found for the active institute.",
      };
    }
    return {
      status: "ready",
      parent: parentDtoToDetailItem(dto),
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
    const message = err instanceof Error ? err.message : "Failed to load parent";

    if (status === 403) {
      return { status: "forbidden", parent: null, errorMessage: message };
    }
    if (status === 404) {
      return { status: "empty", parent: null, errorMessage: "Parent not found." };
    }
    return { status: "error", parent: null, errorMessage: message };
  }
}

export async function loadParentsList(
  activeInstituteId: string | null,
): Promise<ParentsListState> {
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
    const dtos = await listParents({ instituteId: activeInstituteId });
    const items = parentDtosToListItems(dtos);
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
      err instanceof Error ? err.message : "Failed to load parents";

    if (status === 403) {
      return {
        status: "forbidden",
        items: [],
        errorMessage: message,
      };
    }
    return {
      status: "error",
      items: [],
      errorMessage: message,
    };
  }
}
