import type { ReportDefinitionDto, ReportJobDto } from "./types";
import type { ReportsLoadStatus } from "./load";

export function resolveReportsCatalogView(input: {
  apiMode: boolean;
  instituteStatus:
    | "demo"
    | "loading"
    | "ready"
    | "needs_selection"
    | "empty"
    | "forbidden"
    | "error";
  activeInstituteId: string | null;
  resolvedForInstituteId: string | null;
  storedCatalog: ReportDefinitionDto[];
  storedJobs: ReportJobDto[];
  storedStatus: ReportsLoadStatus;
  storedErrorMessage: string | null;
  storedJobsErrorMessage?: string | null;
  instituteErrorMessage: string | null;
}): {
  status: ReportsLoadStatus;
  catalog: ReportDefinitionDto[];
  jobs: ReportJobDto[];
  errorMessage: string | null;
  jobsErrorMessage: string | null;
  rowsValid: boolean;
} {
  if (!input.apiMode) {
    return {
      status: "demo",
      catalog: input.storedCatalog,
      jobs: input.storedJobs,
      errorMessage: null,
      jobsErrorMessage: null,
      rowsValid: true,
    };
  }
  if (input.instituteStatus === "loading") {
    return {
      status: "loading",
      catalog: [],
      jobs: [],
      errorMessage: null,
      jobsErrorMessage: null,
      rowsValid: false,
    };
  }
  if (input.instituteStatus === "error" || input.instituteStatus === "forbidden") {
    return {
      status: input.instituteStatus === "forbidden" ? "forbidden" : "error",
      catalog: [],
      jobs: [],
      errorMessage: input.instituteErrorMessage,
      jobsErrorMessage: null,
      rowsValid: false,
    };
  }
  if (
    input.instituteStatus === "needs_selection" ||
    input.instituteStatus === "empty" ||
    !input.activeInstituteId
  ) {
    return {
      status: "needs_institute",
      catalog: [],
      jobs: [],
      errorMessage: null,
      jobsErrorMessage: null,
      rowsValid: false,
    };
  }
  if (input.resolvedForInstituteId !== input.activeInstituteId) {
    return {
      status: "loading",
      catalog: [],
      jobs: [],
      errorMessage: null,
      jobsErrorMessage: null,
      rowsValid: false,
    };
  }
  return {
    status: input.storedStatus,
    catalog: input.storedCatalog,
    jobs: input.storedJobs,
    errorMessage: input.storedErrorMessage,
    jobsErrorMessage: input.storedJobsErrorMessage ?? null,
    rowsValid: input.storedStatus === "ready" || input.storedStatus === "empty",
  };
}

export function shouldCommitReportsLoad(opts: {
  cancelled: boolean;
  requestInstituteId: string;
  activeInstituteId: string | null;
}): boolean {
  if (opts.cancelled) return false;
  if (!opts.activeInstituteId) return false;
  return opts.requestInstituteId === opts.activeInstituteId;
}
