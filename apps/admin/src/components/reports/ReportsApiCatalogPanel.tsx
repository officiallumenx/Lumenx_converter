import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardHeader, PageStack, Pill } from "@lumenx/ui-admin";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  countSupportedReports,
  createReportJob,
  downloadReportJob,
  filterCatalogByModule,
  formatReportJobWhen,
  listReportModules,
  resolveReportName,
  resolveReportsCatalogView,
  saveBlobAsFile,
  sortJobsNewestFirst,
  type ReportDefinitionDto,
  type ReportJobDto,
  type ReportsLoadStatus,
} from "@/lib/reports";
import { Download, FileText, Info } from "lucide-react";
import {
  useReportsCatalogQuery,
  adminModulePrefix,
  adminQueryRoots,
} from "@/lib/admin-queries";

function statusHint(status: ReportsLoadStatus, error: string | null): string {
  if (status === "loading") return "Loading report catalog…";
  if (status === "needs_institute") return "Select an institute to load reports.";
  if (status === "forbidden") return error ?? "Access denied.";
  if (status === "error") return error ?? "Failed to load reports.";
  if (status === "empty") return "No reports in catalog.";
  return "";
}

function jobTone(status: ReportJobDto["status"]) {
  if (status === "ready") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "running") return "warning" as const;
  return "info" as const;
}

export function ReportsApiCatalogPanel() {
  const notify = useAdminToast();
  const queryClient = useQueryClient();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [queueingId, setQueueingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const reportsEnabled =
    instituteCtx.status === "ready" && Boolean(instituteCtx.activeInstituteId);
  const reportsQuery = useReportsCatalogQuery(
    instituteCtx.activeInstituteId,
    reportsEnabled,
  );

  const catalog = reportsQuery.data?.catalog ?? [];
  const jobs = reportsQuery.data?.jobs ?? [];
  const jobsError = reportsQuery.data?.jobsErrorMessage ?? null;
  const loadStatus: ReportsLoadStatus =
    instituteCtx.status === "loading"
      ? "loading"
      : instituteCtx.status === "forbidden"
        ? "forbidden"
        : instituteCtx.status === "error"
          ? "error"
          : instituteCtx.status === "needs_selection" ||
              instituteCtx.status === "empty" ||
              !instituteCtx.activeInstituteId
            ? "needs_institute"
            : reportsQuery.isLoading && !reportsQuery.data
              ? "loading"
              : (reportsQuery.data?.status ?? "loading");
  const loadError =
    instituteCtx.status === "error" || instituteCtx.status === "forbidden"
      ? instituteCtx.errorMessage
      : (reportsQuery.data?.errorMessage ?? null);
  const resolvedForInstituteId =
    reportsQuery.data && reportsEnabled ? instituteCtx.activeInstituteId : null;

  const view = resolveReportsCatalogView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedCatalog: catalog,
    storedJobs: jobs,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    storedJobsErrorMessage: jobsError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const hint = statusHint(view.status, view.errorMessage);
  const modules = useMemo(() => listReportModules(view.catalog), [view.catalog]);
  const filteredCatalog = useMemo(
    () => filterCatalogByModule(view.catalog, moduleFilter),
    [view.catalog, moduleFilter],
  );
  const sortedJobs = useMemo(
    () => sortJobsNewestFirst(view.jobs),
    [view.jobs],
  );
  const supportedCount = countSupportedReports(view.catalog);

  const invalidateReports = () => {
    const id = instituteCtx.activeInstituteId;
    if (!id) return;
    void queryClient.invalidateQueries({
      queryKey: adminModulePrefix(id, adminQueryRoots.reports),
    });
  };

  const queueExport = async (report: ReportDefinitionDto) => {
    if (!instituteCtx.activeInstituteId) return;
    setQueueingId(report.id);
    try {
      const job = await createReportJob({
        instituteId: instituteCtx.activeInstituteId,
        reportId: report.id,
      });
      if (job.status === "ready") {
        notify(`Report ready · ${report.name}`);
      } else if (job.status === "failed") {
        notify(job.errorMessage ?? `Report failed · ${report.name}`);
      } else {
        notify(`Queued · ${report.name}`);
      }
      invalidateReports();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to queue export");
    } finally {
      setQueueingId(null);
    }
  };

  const downloadJob = async (job: ReportJobDto) => {
    if (job.status !== "ready") return;
    setDownloadingId(job.id);
    try {
      const { blob, fileName } = await downloadReportJob(job.id);
      saveBlobAsFile(blob, job.fileName ?? fileName);
      notify(`Downloaded ${job.fileName ?? fileName}`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <PageStack>
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex gap-3">
          <Info className="size-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            Reports export institute data as CSV files. Jobs persist in{" "}
            <span className="font-mono">report_job</span> and download through
            authenticated API routes — no public URLs. For live dashboards and
            charts, use Analytics.
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Report catalog"
          hint={`${supportedCount} of ${view.catalog.length} reports have CSV generators`}
          action={<Pill tone="neutral">Live data</Pill>}
        />
        {hint ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">{hint}</p>
        ) : (
          <>
            <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
              <div className="lx-segmented-scroll flex-1 min-w-0">
                <div className="flex items-center gap-1 p-1 bg-background rounded-md border border-border w-max max-w-full">
                  <button
                    type="button"
                    onClick={() => setModuleFilter("all")}
                    className={`px-3 h-7 rounded text-[11px] font-medium transition-colors ${
                      moduleFilter === "all"
                        ? "bg-surface text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    All
                  </button>
                  {modules.map((moduleName) => (
                    <button
                      key={moduleName}
                      type="button"
                      onClick={() => setModuleFilter(moduleName)}
                      className={`px-3 h-7 rounded text-[11px] font-medium transition-colors ${
                        moduleFilter === moduleName
                          ? "bg-surface text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {moduleName}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-xs text-muted-foreground sm:ml-auto font-mono shrink-0">
                {filteredCatalog.length} reports
              </div>
            </div>
            <div className="px-5 pb-5 divide-y divide-border">
              {filteredCatalog.map((report) => (
                <div
                  key={report.id}
                  className="py-4 first:pt-2 last:pb-2 flex flex-wrap items-center gap-4"
                >
                  <FileText className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{report.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                      <Pill tone="neutral">{report.module}</Pill>
                      <span className="font-mono">id: {report.id}</span>
                      {report.generationSupported === false ? (
                        <Pill tone="warning">generator unavailable</Pill>
                      ) : null}
                    </div>
                  </div>
                  {writesEnabled ? (
                    <Button
                      loading={queueingId === report.id}
                      disabled={
                        Boolean(view.jobsErrorMessage) ||
                        report.generationSupported === false ||
                        queueingId !== null
                      }
                      onClick={() => void queueExport(report)}
                    >
                      <Download className="size-3.5" /> Export CSV
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {view.jobsErrorMessage ? (
        <Card>
          <CardHeader
            title="Recent jobs unavailable"
            hint="Could not load jobs — catalog still available"
          />
          <p className="px-4 pb-4 text-sm text-muted-foreground">{view.jobsErrorMessage}</p>
        </Card>
      ) : sortedJobs.length > 0 ? (
        <Card>
          <CardHeader
            title="Recent jobs"
            hint="Durable · auth-gated CSV download"
          />
          <ul className="divide-y divide-border">
            {sortedJobs.map((job) => (
              <li
                key={job.id}
                className="px-5 py-3 flex flex-wrap items-center gap-2 text-xs"
              >
                <div className="flex-1 min-w-[180px]">
                  <div className="font-medium text-foreground">
                    {resolveReportName(job.reportId, view.catalog)}
                  </div>
                  <div className="text-muted-foreground font-mono mt-0.5">
                    {job.reportId}
                    {job.fileName ? ` · ${job.fileName}` : ""}
                  </div>
                </div>
                <Pill tone={jobTone(job.status)}>{job.status}</Pill>
                {job.status === "ready" ? (
                  <Button
                    loading={downloadingId === job.id}
                    onClick={() => void downloadJob(job)}
                  >
                    <Download className="size-3.5" /> Download
                  </Button>
                ) : job.status === "failed" ? (
                  <span
                    className="text-muted-foreground max-w-xs truncate"
                    title={job.errorMessage ?? undefined}
                  >
                    {job.errorMessage ?? "Failed"}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Processing…</span>
                )}
                <span className="text-muted-foreground w-full sm:w-auto sm:ml-auto">
                  {formatReportJobWhen(job.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </PageStack>
  );
}
