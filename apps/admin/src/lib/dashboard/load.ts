/**
 * Home dashboard summary — API mode uses GET /api/v1/analytics (no demo fan-out).
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { getAnalyticsSummary } from "@/lib/analytics/api";

export type DashboardSummary = {
  students: number;
  teachers: number;
  parents: number;
  openComplaints: number;
  pendingLeave: number;
  homeworkItems: number;
};

export type DashboardLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "forbidden"
  | "error";

export type DashboardSummaryState = {
  status: DashboardLoadStatus;
  summary: DashboardSummary | null;
  errorMessage: string | null;
};

export async function loadDashboardSummary(
  activeInstituteId: string | null,
): Promise<DashboardSummaryState> {
  if (!isApiAuthMode()) {
    return { status: "demo", summary: null, errorMessage: null };
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", summary: null, errorMessage: null };
  }
  try {
    const dto = await getAnalyticsSummary(activeInstituteId);
    return {
      status: "ready",
      summary: {
        students: dto.students,
        teachers: dto.teachers,
        parents: dto.parents,
        openComplaints: dto.openComplaints,
        pendingLeave: dto.pendingLeave,
        homeworkItems: dto.homeworkItems,
      },
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
    const message = err instanceof Error ? err.message : "Failed to load dashboard";
    if (status === 403) {
      return { status: "forbidden", summary: null, errorMessage: message };
    }
    return { status: "error", summary: null, errorMessage: message };
  }
}
