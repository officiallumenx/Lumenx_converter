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
  latestJobByReportId,
  listReportModules,
  resolveReportsCatalogView,
  saveBlobAsFile,
  sortJobsNewestFirst,
  type ReportDefinitionDto,
  type ReportJobDto,
  type ReportsLoadStatus,
} from "@/lib/reports";
import { Download, FileText, Info, RefreshCw } from "lucide-react";
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

function defaultMonthRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  const toDate = now.toISOString().slice(0, 10);
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { fromDate: from.toISOString().slice(0, 10), toDate };
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
  const monthDefaults = defaultMonthRange();
  const [fromDate, setFromDate] = useState(monthDefaults.fromDate);
  const [toDate, setToDate] = useState(monthDefaults.toDate);

  const reportsEnabled =
    instituteCtx.status === "ready" && Boolean(instituteCtx.activeInstituteId);

  const reportsQuery = useReportsCatalogQuery(
    instituteCtx.activeInstituteId,
    reportsEnabled,
    {
      refetchInterval: (query) => {
        const active = (query.state.data?.jobs ?? []).some(
          (job) => job.status === "queued" || job.status === "running",
        );
        return active ? 2500 : false;
      },
    },
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
  const latestJobs = useMemo(
    () => latestJobByReportId(sortJobsNewestFirst(view.jobs)),
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
    if (fromDate && toDate && fromDate > toDate) {
      notify("From date must be on or before To date.");
      return;
    }
    setQueueingId(report.id);
    try {
      const job = await createReportJob({
        instituteId: instituteCtx.activeInstituteId,
        reportId: report.id,
        fromDate: fromDate || null,
        toDate: toDate || null,
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
    <PageStack className="animate-in fade-in duration-300">
      <Card className="p-4 border-primary/20 bg-primary/5 transition-colors">
        <div className="flex gap-3">
          <Info className="size-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            Exports are live CSV snapshots from your institute database. The date
            range applies to attendance, audit, leave, events, complaints, and
            admissions. After export, use Download beside the same report.
          </div>
        </div>
      </Card>

      {view.jobsErrorMessage ? (
        <Card className="border-destructive/30">
          <p className="px-4 py-3 text-xs text-muted-foreground">
            Job history unavailable — export may still work, but Download will not
            appear until jobs load. {view.jobsErrorMessage}
          </p>
        </Card>
      ) : null}

      <Card className="transition-shadow duration-200">
        <CardHeader
          title="Export period"
          hint="Applied to attendance, audit, leave, events, complaints & admissions"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => invalidateReports()}
              disabled={reportsQuery.isFetching}
            >
              <RefreshCw
                className={`size-3.5 ${reportsQuery.isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          }
        />
        <div className="px-5 pb-5 flex flex-wrap items-end gap-3">
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="block h-9 rounded-md border border-border bg-background px-3 text-xs"
            />
          </label>
          <label className="text-xs space-y-1">
            <span className="text-muted-foreground">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="block h-9 rounded-md border border-border bg-background px-3 text-xs"
            />
          </label>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const next = defaultMonthRange();
              setFromDate(next.fromDate);
              setToDate(next.toDate);
            }}
          >
            This month
          </Button>
        </div>
      </Card>

      <Card className="transition-shadow duration-200">
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
                        : "text-muted-foreground hover:text-foreground"
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
                          : "text-muted-foreground hover:text-foreground"
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
              {filteredCatalog.map((report) => {
                const latest = latestJobs.get(report.id) ?? null;
                const isProcessing =
                  latest?.status === "queued" || latest?.status === "running";
                const isReady = latest?.status === "ready";
                const isFailed = latest?.status === "failed";

                return (
                  <div
                    key={report.id}
                    className="py-4 first:pt-2 last:pb-2 flex flex-wrap items-center gap-3 transition-colors hover:bg-muted/20 -mx-2 px-2 rounded-lg"
                  >
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{report.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                        <Pill tone="neutral">{report.module}</Pill>
                        {report.generationSupported === false ? (
                          <Pill tone="warning">generator unavailable</Pill>
                        ) : null}
                        {isReady && latest?.completedAt ? (
                          <span className="font-mono">
                            as of {formatReportJobWhen(latest.completedAt)}
                          </span>
                        ) : null}
                        {isFailed ? (
                          <span
                            className="text-destructive truncate max-w-[220px]"
                            title={latest?.errorMessage ?? undefined}
                          >
                            {latest?.errorMessage ?? "Export failed"}
                          </span>
                        ) : null}
                        {isProcessing ? (
                          <span className="inline-flex items-center gap-1">
                            <RefreshCw className="size-3 animate-spin" />
                            Processing…
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {writesEnabled ? (
                        <Button
                          size="sm"
                          loading={queueingId === report.id}
                          disabled={
                            Boolean(view.jobsErrorMessage) ||
                            report.generationSupported === false ||
                            queueingId !== null ||
                            isProcessing
                          }
                          onClick={() => void queueExport(report)}
                        >
                          <FileText className="size-3.5" /> Export CSV
                        </Button>
                      ) : null}
                      {isReady && latest ? (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={downloadingId === latest.id}
                          onClick={() => void downloadJob(latest)}
                        >
                          <Download className="size-3.5" /> Download
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </PageStack>
  );
}
