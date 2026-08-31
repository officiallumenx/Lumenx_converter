import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listTeacherPerformance } from "./api";
import type { TeacherPerformanceDto, TeacherPerformanceSummary } from "./types";

export type TeacherPerformanceLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type TeacherPerformanceListState = {
  status: TeacherPerformanceLoadStatus;
  rows: TeacherPerformanceDto[];
  summary: TeacherPerformanceSummary | null;
  errorMessage: string | null;
};

export async function loadTeacherPerformanceList(
  activeInstituteId: string | null,
): Promise<TeacherPerformanceListState> {
  if (!isApiAuthMode()) {
    return { status: "demo", rows: [], summary: null, errorMessage: null };
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      rows: [],
      summary: null,
      errorMessage: null,
    };
  }
  try {
    const payload = await listTeacherPerformance(activeInstituteId);
    return {
      status: payload.teachers.length === 0 ? "empty" : "ready",
      rows: payload.teachers,
      summary: payload.summary,
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
      err instanceof Error ? err.message : "Failed to load teacher performance";
    if (status === 403) {
      return { status: "forbidden", rows: [], summary: null, errorMessage: message };
    }
    return { status: "error", rows: [], summary: null, errorMessage: message };
  }
}
