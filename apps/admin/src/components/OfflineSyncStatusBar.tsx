import { useCallback, useEffect, useState } from "react";
import { Button, Pill } from "@lumenx/ui-admin";
import {
  flushOfflineQueue,
  getFailedSyncCount,
  getLastSyncedAt,
  getPendingSyncCount,
  loadOfflineSyncMeta,
  setAutoSync,
} from "@lumenx/utils";
import { PendingSyncBadge } from "@lumenx/ui";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { appendAdminAuditEntry } from "@/lib/audit-activity-data";
import { useAuth } from "@/auth/AuthContext";

function formatSynced(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Compact offline sync status: Last Synced · Pending Sync Count · Auto Sync. */
export function OfflineSyncStatusBar({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [autoSync, setAuto] = useState(true);
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    setPending(getPendingSyncCount("admin"));
    setFailed(getFailedSyncCount("admin"));
    setLastSynced(getLastSyncedAt());
    setAuto(loadOfflineSyncMeta().autoSync);
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    const onOnline = () => {
      setOnline(true);
      refresh();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("lumenx-offline-sync-changed", onChange);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("lumenx-offline-sync-changed", onChange);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refresh]);

  const syncNow = async () => {
    setBusy(true);
    const result = await flushOfflineQueue("admin");
    appendAdminAuditEntry({
      user: user?.name ?? "Admin",
      role: "Admin",
      action: "Flushed offline sync queue",
      target: `${result.flushed} mutation${result.flushed === 1 ? "" : "s"}`,
      module: "Platform",
    });
    refresh();
    setBusy(false);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-[11px]">
        {online ? (
          <Cloud className="size-3.5 text-success" />
        ) : (
          <CloudOff className="size-3.5 text-warning" />
        )}
        <span className="text-muted-foreground">Synced</span>
        <span className="font-medium tabular-nums">{formatSynced(lastSynced)}</span>
        <PendingSyncBadge />
        {failed > 0 && pending === 0 ? <Pill tone="danger">{failed} failed</Pill> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        {online ? (
          <Cloud className="size-4 text-success" />
        ) : (
          <CloudOff className="size-4 text-warning" />
        )}
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Last synced
          </div>
          <div className="font-medium tabular-nums">{formatSynced(lastSynced)}</div>
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Pending sync
        </div>
        <div className="font-mono font-semibold">{pending + failed}</div>
      </div>
      <PendingSyncBadge />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={autoSync}
          onChange={(e) => {
            setAutoSync(e.target.checked);
            refresh();
          }}
        />
        Automatic sync
      </label>
      <Button
        size="sm"
        variant="outline"
        disabled={busy || pending + failed === 0}
        onClick={() => void syncNow()}
      >
        <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
        Sync now
      </Button>
    </div>
  );
}
