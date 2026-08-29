import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listReportCatalog, listReportJobs } from "./api";
import type { ReportDefinitionDto, ReportJobDto } from "./types";

export type ReportsLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type ReportsCatalogState = {
  status: ReportsLoadStatus;
  catalog: ReportDefinitionDto[];
  jobs: ReportJobDto[];
  errorMessage: string | null;
};

export async function loadReportsCatalog(
  activeInstituteId: string | null,
): Promise<ReportsCatalogState> {
  if (!isApiAuthMode()) {
    return { status: "demo", catalog: [], jobs: [], errorMessage: null };
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", catalog: [], jobs: [], errorMessage: null };
  }
  try {
    const [catalog, jobs] = await Promise.all([
      listReportCatalog(activeInstituteId),
      listReportJobs(activeInstituteId),
    ]);
    return {
      status: catalog.length === 0 ? "empty" : "ready",
      catalog,
      jobs,
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
    const message = err instanceof Error ? err.message : "Failed to load reports";
    if (status === 403) {
      return { status: "forbidden", catalog: [], jobs: [], errorMessage: message };
    }
    return { status: "error", catalog: [], jobs: [], errorMessage: message };
  }
}
