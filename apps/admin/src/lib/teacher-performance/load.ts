import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listTeacherPerformance } from "./api";
import type { TeacherPerformanceDto } from "./types";

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
  errorMessage: string | null;
};

export async function loadTeacherPerformanceList(
  activeInstituteId: string | null,
): Promise<TeacherPerformanceListState> {
  if (!isApiAuthMode()) {
    return { status: "demo", rows: [], errorMessage: null };
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", rows: [], errorMessage: null };
  }
  try {
    const rows = await listTeacherPerformance(activeInstituteId);
    return {
      status: rows.length === 0 ? "empty" : "ready",
      rows,
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
      return { status: "forbidden", rows: [], errorMessage: message };
    }
    return { status: "error", rows: [], errorMessage: message };
  }
}
