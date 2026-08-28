import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, CardHeader, Pill } from "@lumenx/ui-admin";
import {
  RECYCLE_BIN_RETENTION_DAYS,
  daysLeftInRecycleBin,
  ensureRecycleBinDemoSeed,
  loadRecycleBin,
  permanentlyDeleteFromRecycleBin,
  type RecycleBinItem,
} from "@lumenx/utils";
import { restoreRecycleBinEntity } from "@/lib/recycle-restore";
import { RotateCcw, Trash2 } from "lucide-react";
import { appendAdminAuditEntry } from "@/lib/audit-activity-data";
import { useAdminToast } from "@/components/AdminActionToast";
import { useAuth } from "@/auth/AuthContext";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadRecycleItemsList,
  resolveRecycleListView,
  shouldCommitRecycleLoad,
  type RecycleListItem,
  type RecycleListStatus,
} from "@/lib/recycle";

type RecycleRow = RecycleBinItem | RecycleListItem;

export function RecycleBinPanel() {
  const notify = useAdminToast();
  const { user } = useAuth();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = !apiMode;

  const [demoItems, setDemoItems] = useState<RecycleBinItem[]>(() => {
    if (apiMode) return [];
    ensureRecycleBinDemoSeed();
    return loadRecycleBin();
  });

  const [apiItems, setApiItems] = useState<RecycleListItem[]>([]);
  const [listStatus, setListStatus] = useState<RecycleListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const listView = resolveRecycleListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const displayItems: RecycleRow[] = apiMode ? listView.items : demoItems;
  const displayStatus = listView.status;
  const displayError = listView.errorMessage;

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiItems([]);
      setListStatus("loading");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiItems([]);
      setListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiItems([]);
      setListStatus("needs_institute");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setListStatus("loading");
    setListError(null);
    void loadRecycleItemsList(requestInstituteId).then((next) => {
      if (
        !shouldCommitRecycleLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiItems(next.items);
      setListStatus(next.status);
      setListError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
  ]);

  const refreshDemo = () => setDemoItems(loadRecycleBin());

  const sorted = useMemo(
    () => [...displayItems].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)),
    [displayItems],
  );

  const listHint =
    displayStatus === "loading"
      ? "Loading recycle bin…"
      : displayStatus === "needs_institute"
        ? "Select an active institute to load recycle bin items"
        : displayStatus === "forbidden"
          ? "You do not have access to the recycle bin for this institute"
          : displayStatus === "error"
            ? displayError ?? "Failed to load recycle bin items"
            : displayStatus === "empty"
              ? "Recycle bin is empty"
              : null;

  const restore = (item: RecycleBinItem) => {
    if (!writesEnabled) return;
    restoreRecycleBinEntity(item);
    appendAdminAuditEntry({
      user: user?.name ?? "Admin",
      action: "Restored from recycle bin",
      target: item.title,
      module: "Storage",
      status: "info",
    });
    refreshDemo();
    notify(`Restored “${item.title}” to ${item.module}`);
  };

  const purge = (item: RecycleBinItem) => {
    if (!writesEnabled) return;
    permanentlyDeleteFromRecycleBin(item.id);
    appendAdminAuditEntry({
      user: user?.name ?? "Admin",
      action: "Permanently deleted from recycle bin",
      target: item.title,
      module: "Storage",
      status: "warning",
    });
    refreshDemo();
    notify(`Permanently deleted “${item.title}”`);
  };

  return (
    <Card>
      <CardHeader
        title="Recycle Bin"
        hint={
          apiMode
            ? "API mode · read-only list"
            : `Soft-deleted items · auto-purge after ${RECYCLE_BIN_RETENTION_DAYS} days`
        }
        action={
          <Pill tone="neutral">
            {apiMode && !listView.rowsValid ? "…" : `${sorted.length} items`}
          </Pill>
        }
      />
      <div className="px-4 sm:px-5 pb-5">
        {apiMode && !listView.rowsValid ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{listHint}</p>
        ) : sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {apiMode ? listHint ?? "Recycle bin is empty." : "Recycle bin is empty."}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {sorted.map((item) => {
              const left = daysLeftInRecycleBin(item as RecycleBinItem);
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {item.module}
                      {item.subtitle ? ` · ${item.subtitle}` : ""} · deleted by{" "}
                      {item.deletedBy} ·{" "}
                      {new Date(item.deletedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Pill tone={left <= 7 ? "warning" : "neutral"}>{left}d left</Pill>
                  {writesEnabled ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restore(item as RecycleBinItem)}
                      >
                        <RotateCcw className="size-3.5" /> Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="!text-destructive !border-destructive/40"
                        onClick={() => purge(item as RecycleBinItem)}
                      >
                        <Trash2 className="size-3.5" /> Delete forever
                      </Button>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
