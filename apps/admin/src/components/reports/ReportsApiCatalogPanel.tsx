import { useEffect, useRef, useState } from "react";
import { Button, Card, CardHeader, Pill } from "@lumenx/ui-admin";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  createReportJob,
  downloadReportJob,
  loadReportsCatalog,
  resolveReportsCatalogView,
  saveBlobAsFile,
  shouldCommitReportsLoad,
  type ReportDefinitionDto,
  type ReportJobDto,
  type ReportsLoadStatus,
} from "@/lib/reports";
import { Download, FileText } from "lucide-react";

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
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const [catalog, setCatalog] = useState<ReportDefinitionDto[]>([]);
  const [jobs, setJobs] = useState<ReportJobDto[]>([]);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<ReportsLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const [queueingId, setQueueingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setCatalog([]);
      setJobs([]);
      setJobsError(null);
      setLoadStatus("loading");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setCatalog([]);
      setJobs([]);
      setJobsError(null);
      setLoadStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setLoadError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }
    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setCatalog([]);
      setJobs([]);
      setJobsError(null);
      setLoadStatus("needs_institute");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);
    void loadReportsCatalog(requestInstituteId).then((next) => {
      if (
        !shouldCommitReportsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setCatalog(next.catalog);
      setJobs(next.jobs);
      setJobsError(next.jobsErrorMessage);
      setLoadStatus(next.status);
      setLoadError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

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
      setReloadKey((k) => k + 1);
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
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Report catalog"
          hint="Jobs persist in report_job. CSV is generated in the queue request (no worker queue / Storage bucket)."
          action={<Pill tone="neutral">API mode</Pill>}
        />
        {hint ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">{hint}</p>
        ) : (
          <div className="px-5 pb-5 divide-y divide-border">
            {view.catalog.map((r) => (
              <div
                key={r.id}
                className="py-4 first:pt-2 last:pb-2 flex flex-wrap items-center gap-4"
              >
                <FileText className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                    <Pill tone="neutral">{r.module}</Pill>
                    <span className="font-mono">id: {r.id}</span>
                    {r.generationSupported === false ? (
                      <Pill tone="warning">generator unavailable</Pill>
                    ) : null}
                  </div>
                </div>
                {writesEnabled ? (
                  <Button
                    loading={queueingId === r.id}
                    disabled={
                      Boolean(view.jobsErrorMessage) ||
                      r.generationSupported === false ||
                      queueingId !== null
                    }
                    onClick={() => void queueExport(r)}
                  >
                    <Download className="size-3.5" /> Queue export
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
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
      ) : view.jobs.length > 0 ? (
        <Card>
          <CardHeader
            title="Recent jobs"
            hint="Durable · auth-gated download (no public URLs)"
          />
          <ul className="divide-y divide-border">
            {view.jobs.map((j) => (
              <li
                key={j.id}
                className="px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <span className="font-mono">{j.reportId}</span>
                <Pill tone={jobTone(j.status)}>{j.status}</Pill>
                {j.status === "ready" ? (
                  <Button
                    loading={downloadingId === j.id}
                    onClick={() => void downloadJob(j)}
                  >
                    <Download className="size-3.5" /> Download
                  </Button>
                ) : j.status === "failed" ? (
                  <span className="text-muted-foreground max-w-xs truncate" title={j.errorMessage ?? undefined}>
                    {j.errorMessage ?? "Failed"}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Processing…</span>
                )}
                <span className="text-muted-foreground">{j.createdAt}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
