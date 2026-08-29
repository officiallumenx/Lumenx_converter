import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { getAnalyticsSummary } from "./api";
import type { AnalyticsSummaryDto } from "./types";

export type AnalyticsLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "forbidden"
  | "error";

export type AnalyticsSummaryState = {
  status: AnalyticsLoadStatus;
  summary: AnalyticsSummaryDto | null;
  errorMessage: string | null;
};

export async function loadAnalyticsSummary(
  activeInstituteId: string | null,
): Promise<AnalyticsSummaryState> {
  if (!isApiAuthMode()) {
    return { status: "demo", summary: null, errorMessage: null };
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", summary: null, errorMessage: null };
  }
  try {
    const summary = await getAnalyticsSummary(activeInstituteId);
    return { status: "ready", summary, errorMessage: null };
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
    const message = err instanceof Error ? err.message : "Failed to load analytics";
    if (status === 403) {
      return { status: "forbidden", summary: null, errorMessage: message };
    }
    return { status: "error", summary: null, errorMessage: message };
  }
}
