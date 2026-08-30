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
  /** Jobs list failed independently (e.g. report_job table missing). Catalog may still be ready. */
  jobsErrorMessage: string | null;
};

export async function loadReportsCatalog(
  activeInstituteId: string | null,
): Promise<ReportsCatalogState> {
  if (!isApiAuthMode()) {
    return {
      status: "demo",
      catalog: [],
      jobs: [],
      errorMessage: null,
      jobsErrorMessage: null,
    };
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      catalog: [],
      jobs: [],
      errorMessage: null,
      jobsErrorMessage: null,
    };
  }
  try {
    const catalog = await listReportCatalog(activeInstituteId);
    let jobs: ReportJobDto[] = [];
    let jobsErrorMessage: string | null = null;
    try {
      jobs = await listReportJobs(activeInstituteId);
    } catch (jobsErr) {
      jobsErrorMessage =
        jobsErr instanceof Error ? jobsErr.message : "Failed to load report jobs";
    }
    return {
      status: catalog.length === 0 ? "empty" : "ready",
      catalog,
      jobs,
      errorMessage: null,
      jobsErrorMessage,
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
      return {
        status: "forbidden",
        catalog: [],
        jobs: [],
        errorMessage: message,
        jobsErrorMessage: null,
      };
    }
    return {
      status: "error",
      catalog: [],
      jobs: [],
      errorMessage: message,
      jobsErrorMessage: null,
    };
  }
}
