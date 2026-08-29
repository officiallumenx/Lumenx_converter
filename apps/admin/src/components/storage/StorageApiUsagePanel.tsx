import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, EmptyState, Kpi, Pill } from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadStorageUsage,
  resolveStorageUsageView,
  shouldCommitAssetsLoad,
  type AssetsLoadStatus,
  type StorageUsageSummary,
} from "@/lib/assets";
import { HardDrive } from "lucide-react";

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function statusHint(status: AssetsLoadStatus, error: string | null): string {
  if (status === "loading") return "Loading asset usage…";
  if (status === "needs_institute") return "Select an institute to load storage usage.";
  if (status === "forbidden") return error ?? "Access denied.";
  if (status === "error") return error ?? "Failed to load assets.";
  if (status === "empty") return "No assets stored for this institute yet.";
  return "";
}

export function StorageApiUsagePanel() {
  const instituteCtx = useInstituteContext();
  const [summary, setSummary] = useState<StorageUsageSummary | null>(null);
  const [loadStatus, setLoadStatus] = useState<AssetsLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setSummary(null);
      setLoadStatus("loading");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setSummary(null);
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
      setSummary(null);
      setLoadStatus("needs_institute");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);
    void loadStorageUsage(requestInstituteId).then((next) => {
      if (
        !shouldCommitAssetsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setSummary(next.summary);
      setLoadStatus(next.status);
      setLoadError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId, instituteCtx.errorMessage]);

  const view = resolveStorageUsageView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedSummary: summary,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const hint = statusHint(view.status, view.errorMessage);
  const displaySummary = view.rowsValid ? view.summary : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Asset storage"
          hint="From GET /assets · demo category breakdown is not shown in API mode"
          action={<Pill tone="neutral">Read-only · API mode</Pill>}
        />
        {hint ? (
          <EmptyState icon={<HardDrive className="size-5" />} title="Storage usage" hint={hint} />
        ) : displaySummary ? (
          <div className="px-4 pb-4 lx-kpi-grid">
            <Kpi
              label="Total assets"
              value={String(displaySummary.totalAssets)}
              icon={<HardDrive className="size-3.5" />}
            />
            <Kpi label="Total size" value={fmtBytes(displaySummary.totalBytes)} />
            <Kpi label="Categories" value={String(displaySummary.byCategory.length)} />
          </div>
        ) : null}
      </Card>

      {displaySummary && displaySummary.byCategory.length > 0 ? (
        <Card>
          <CardHeader title="By category" hint="Aggregated from institute assets" />
          <div className="px-4 pb-4 divide-y divide-border">
            {displaySummary.byCategory.map((row) => (
              <div
                key={row.category}
                className="flex items-center justify-between py-2.5 text-sm first:pt-0 last:pb-0"
              >
                <span className="font-medium">{row.category.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground tabular-nums">
                  {row.count} files · {fmtBytes(row.bytes)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
