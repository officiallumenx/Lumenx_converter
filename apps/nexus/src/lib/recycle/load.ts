import { isNexusApiMode } from "@/lib/auth-mode";
import { ApiClientError } from "@/lib/api";
import { listPlatformRecycleItems } from "./api";
import { recycleDtosToListItems } from "./map";
import type { RecycleListItem } from "./types";

export type RecycleListStatus = "demo" | "loading" | "ready" | "empty" | "forbidden" | "error";

export type RecycleListState = {
  status: RecycleListStatus;
  items: RecycleListItem[];
  errorMessage: string | null;
};

export async function loadPlatformRecycleList(
  instituteId?: string,
): Promise<RecycleListState> {
  if (!isNexusApiMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }

  try {
    const dtos = await listPlatformRecycleItems({ instituteId });
    const items = recycleDtosToListItems(dtos);
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
      err instanceof Error ? err.message : "Failed to load recycle bin";
    if (status === 403) {
      return { status: "forbidden", items: [], errorMessage: message };
    }
    return { status: "error", items: [], errorMessage: message };
  }
}
