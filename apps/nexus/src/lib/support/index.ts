import { isNexusApiMode } from "@/lib/auth-mode";
import type { SupportThread } from "@/lib/support-center-store";
import {
  listSupportThreads,
  supportStats as demoSupportStats,
} from "@/lib/support-center-store";
import {
  getSupportThreadApi,
  listSupportThreadsApi,
} from "./api";
import { supportThreadDtoToUi, supportThreadDtosToUi } from "./map";
import type { SupportCategory, SupportStatus } from "./types";

export type SupportInboxLoadState =
  | { status: "demo"; threads: SupportThread[]; errorMessage: null }
  | { status: "loading"; threads: SupportThread[]; errorMessage: null }
  | { status: "ready"; threads: SupportThread[]; errorMessage: null }
  | { status: "empty"; threads: SupportThread[]; errorMessage: null }
  | { status: "error"; threads: SupportThread[]; errorMessage: string };

export async function loadSupportInbox(filters?: {
  status?: SupportStatus;
  category?: SupportCategory;
}): Promise<SupportInboxLoadState> {
  if (!isNexusApiMode()) {
    let threads = listSupportThreads();
    if (filters?.status) {
      threads = threads.filter((t) => t.status === filters.status);
    }
    if (filters?.category) {
      threads = threads.filter((t) => t.category === filters.category);
    }
    return { status: "demo", threads, errorMessage: null };
  }

  try {
    const rows = await listSupportThreadsApi({
      status: filters?.status,
      category: filters?.category,
    });
    const threads = supportThreadDtosToUi(rows);
    return {
      status: threads.length === 0 ? "empty" : "ready",
      threads,
      errorMessage: null,
    };
  } catch (err) {
    return {
      status: "error",
      threads: [],
      errorMessage: err instanceof Error ? err.message : "Failed to load support threads",
    };
  }
}

export async function loadSupportThreadDetail(
  id: string,
): Promise<SupportThread | null> {
  if (!isNexusApiMode()) {
    return listSupportThreads().find((t) => t.id === id) ?? null;
  }
  try {
    const dto = await getSupportThreadApi(id);
    return supportThreadDtoToUi(dto);
  } catch {
    return null;
  }
}

export function computeSupportStats(threads: SupportThread[]) {
  return demoSupportStats(threads);
}
