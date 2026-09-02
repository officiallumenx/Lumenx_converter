import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Kpi,
  Pill,
} from "@lumenx/ui-admin";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  deleteAsset,
  getAssetSignedUrl,
  loadStorageUsage,
  resolveStorageUsageView,
  shouldCommitAssetsLoad,
  uploadAsset,
  type AssetDto,
  type AssetsLoadStatus,
  type StorageUsageSummary,
} from "@/lib/assets";
import { HardDrive, Download, RefreshCw, Trash2, Upload } from "lucide-react";

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function statusHint(status: AssetsLoadStatus, error: string | null): string {
  if (status === "loading") return "Loading asset usage…";
  if (status === "needs_institute") {
    return "Select an institute to load storage usage.";
  }
  if (status === "forbidden") return error ?? "Access denied.";
  if (status === "error") return error ?? "Failed to load assets.";
  if (status === "empty") return "No assets stored for this institute yet.";
  return "";
}

/**
 * API-mode storage panel.
 * Supports list / usage refresh / upload / signed-URL / soft-delete.
 */
export function StorageApiUsagePanel() {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const [summary, setSummary] = useState<StorageUsageSummary | null>(null);
  const [assets, setAssets] = useState<AssetDto[]>([]);
  const [loadStatus, setLoadStatus] = useState<AssetsLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPurpose, setUploadPurpose] = useState<"logo" | "general">("logo");
  const [refreshing, setRefreshing] = useState(false);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setSummary(null);
      setAssets([]);
      setLoadStatus("loading");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setSummary(null);
      setAssets([]);
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
      setAssets([]);
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
      setAssets(next.assets);
      setLoadStatus(next.status);
      setLoadError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
      setRefreshing(false);
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

  const view = resolveStorageUsageView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedSummary: summary,
    storedAssets: assets,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const hint = statusHint(view.status, view.errorMessage);
  const displaySummary = view.rowsValid ? view.summary : null;
  const displayAssets = view.rowsValid ? view.assets : [];

  const refresh = () => {
    setRefreshing(true);
    setReloadKey((k) => k + 1);
  };

  const remove = async (asset: AssetDto) => {
    if (!writesEnabled || deletingId) return;
    setDeletingId(asset.id);
    try {
      await deleteAsset(asset.id);
      notify(`Deleted ${asset.fileName ?? asset.objectPath}`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to delete asset");
    } finally {
      setDeletingId(null);
    }
  };

  const uploadFile = async (file: File) => {
    if (!writesEnabled || !instituteCtx.activeInstituteId || uploading) return;
    setUploading(true);
    try {
      const asset = await uploadAsset({
        instituteId: instituteCtx.activeInstituteId,
        purpose: uploadPurpose,
        file,
        visibility: "institute",
      });
      notify(`Uploaded ${asset.fileName ?? file.name}`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const download = async (asset: AssetDto) => {
    try {
      const signed = await getAssetSignedUrl(asset.id);
      window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Download failed");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Asset storage"
          hint="Real usage from stored files · upload via Logo or General"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="neutral">API mode</Pill>
              {writesEnabled ? (
                <>
                  <select
                    value={uploadPurpose}
                    onChange={(e) =>
                      setUploadPurpose(e.target.value as "logo" | "general")
                    }
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                    aria-label="Upload type"
                  >
                    <option value="logo">Logo</option>
                    <option value="general">General / Other</option>
                  </select>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={
                      uploadPurpose === "logo"
                        ? "image/png,image/jpeg,image/webp,image/svg+xml"
                        : undefined
                    }
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadFile(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    loading={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-3.5" /> Upload
                  </Button>
                </>
              ) : null}
              <Button
                variant="outline"
                disabled={refreshing || instituteCtx.status === "loading"}
                onClick={refresh}
              >
                <RefreshCw className="size-3.5" /> Refresh
              </Button>
            </div>
          }
        />
        <div className="px-4 pb-4">
          <p className="text-xs text-muted-foreground mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
            Files upload through the backend (service role only). Buckets are private;
            download uses short-lived signed URLs after auth checks. Object paths are
            institute-scoped ({`{instituteId}/{assetId}/{file}`}).
          </p>
          {hint ? (
            <EmptyState
              icon={<HardDrive className="size-5" />}
              title="Storage usage"
              hint={hint}
            />
          ) : displaySummary ? (
            <div className="lx-kpi-grid">
              <Kpi
                label="Total assets"
                value={String(displaySummary.totalAssets)}
                icon={<HardDrive className="size-3.5" />}
              />
              <Kpi label="Total size" value={fmtBytes(displaySummary.totalBytes)} />
              <Kpi
                label="Categories"
                value={String(displaySummary.byCategory.length)}
              />
            </div>
          ) : null}
        </div>
      </Card>

      {displaySummary && displaySummary.byBucket.length > 0 ? (
        <Card>
          <CardHeader title="By bucket" hint="Internal storage grouping" />
          <div className="px-4 pb-4 divide-y divide-border">
            {displaySummary.byBucket.map((row) => (
              <div
                key={row.bucket}
                className="flex items-center justify-between py-2.5 text-sm first:pt-0 last:pb-0"
              >
                <span className="font-medium">{row.bucket.replace(/-/g, " ")}</span>
                <span className="text-muted-foreground tabular-nums">
                  {row.count} files · {fmtBytes(row.bytes)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {displaySummary && displaySummary.byCategory.length > 0 ? (
        <Card>
          <CardHeader title="By category" hint="Aggregated from institute assets" />
          <div className="px-4 pb-4 divide-y divide-border">
            {displaySummary.byCategory.map((row) => (
              <div
                key={row.category}
                className="flex items-center justify-between py-2.5 text-sm first:pt-0 last:pb-0"
              >
                <span className="font-medium">
                  {row.category.replace(/_/g, " ")}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {row.count} files · {fmtBytes(row.bytes)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {view.rowsValid ? (
        <Card>
          <CardHeader
            title="Assets"
            hint="Institute-scoped · soft-delete via DELETE /assets/:id"
          />
          {displayAssets.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              No asset metadata rows for this institute.
            </p>
          ) : (
            <ul className="divide-y divide-border px-4 pb-4">
              {displayAssets.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 py-3 text-sm first:pt-1"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {a.fileName ?? a.objectPath}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono truncate">
                      {a.bucket}/{a.objectPath}
                      {a.byteSize != null ? ` · ${fmtBytes(a.byteSize)}` : ""}
                    </div>
                  </div>
                  <Pill tone="neutral">{a.category.replace(/_/g, " ")}</Pill>
                  <Pill tone="info">{a.visibility}</Pill>
                  <Button
                    variant="outline"
                    onClick={() => void download(a)}
                    aria-label={`Download ${a.fileName ?? a.id}`}
                  >
                    <Download className="size-3.5" />
                  </Button>
                  {writesEnabled ? (
                    <Button
                      variant="outline"
                      disabled={deletingId === a.id}
                      onClick={() => void remove(a)}
                      aria-label={`Delete ${a.fileName ?? a.id}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}
