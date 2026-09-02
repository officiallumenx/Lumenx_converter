/**
 * Nexus platform storage usage — API mode (real bytes from stored_asset).
 */
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardHeader,
  Kpi,
  Pill,
} from "@lumenx/ui-admin";
import { HardDrive, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatBytes, loadNetworkStorageUsage } from "@/lib/storage/load";
import type {
  InstituteStorageRowDto,
  NetworkStorageSummaryDto,
} from "@/lib/storage/types";

export function NexusStorageUsagePanel() {
  const [summary, setSummary] = useState<NetworkStorageSummaryDto | null>(null);
  const [institutes, setInstitutes] = useState<InstituteStorageRowDto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setStatus("loading");
    setError(null);
    const state = await loadNetworkStorageUsage();
    if (state.status === "ready") {
      setSummary(state.summary);
      setInstitutes(state.institutes);
      setStatus("ready");
    } else {
      setSummary(null);
      setInstitutes([]);
      setStatus("error");
      setError(state.errorMessage);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="size-4 animate-spin" /> Loading storage usage…
      </div>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardHeader title="Could not load storage usage" />
        <p className="px-5 pb-5 text-sm text-destructive">{error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Kpi
          label="Institutes with files"
          value={String(summary?.instituteCount ?? 0)}
          icon={<HardDrive className="size-3.5" />}
        />
        <Kpi
          label="Total files"
          value={String(summary?.totalAssets ?? 0)}
        />
        <Kpi
          label="Total storage used"
          value={formatBytes(summary?.totalBytes ?? 0)}
        />
      </div>

      <Card>
        <CardHeader
          title="Network storage usage"
          hint="Aggregated from stored_asset byte_size · monitoring only"
          action={
            <div className="flex items-center gap-2">
              <Pill tone="neutral">API mode</Pill>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => void reload()}
              >
                <RefreshCw className="size-3.5" /> Refresh
              </button>
            </div>
          }
        />
        <p className="px-5 pb-4 text-xs text-muted-foreground">
          Nexus monitors real file storage across institutes. Admin continues to manage
          uploads and deletes inside each institute.
        </p>
      </Card>

      <Card>
        <CardHeader
          title="Usage by institute"
          hint={`${institutes.length} institutes with stored files`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                <th className="px-5 py-3 font-semibold">Institute</th>
                <th className="px-5 py-3 font-semibold text-right">Files</th>
                <th className="px-5 py-3 font-semibold text-right">Storage used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {institutes.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-5 py-10 text-center text-xs text-muted-foreground"
                  >
                    No stored files across the network yet.
                  </td>
                </tr>
              ) : (
                institutes.map((row) => (
                  <tr key={row.instituteId} className="hover:bg-surface-hover">
                    <td className="px-5 py-3">
                      <Link
                        to="/institutes/$id"
                        params={{ id: row.instituteId }}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {row.instituteName}
                      </Link>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {row.instituteCode}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-right">
                      {row.totalAssets.toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-right">
                      {formatBytes(row.totalBytes)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
