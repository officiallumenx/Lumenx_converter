import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  ensureOfflineQueueDemoSeed,
  flushOfflineQueue,
  getOfflineSyncSnapshot,
  OFFLINE_SYNC_SERVER_SNAPSHOT,
  retryFailedOfflineSync,
  startAutomaticOfflineSync,
  subscribeOfflineSync,
  type OfflineSyncApp,
  type OfflineSyncSnapshot,
} from "@lumenx/utils";
import { cn } from "./lib/utils";

const OFFLINE_COPY =
  "You're offline.\nChanges will sync automatically when internet is available.";

type OfflineSyncContextValue = {
  app: OfflineSyncApp;
  snapshot: OfflineSyncSnapshot;
  syncNow: () => Promise<void>;
  retryFailed: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

function subscribe(listener: () => void) {
  return subscribeOfflineSync(listener);
}

function getServerSnapshot(_app: OfflineSyncApp): OfflineSyncSnapshot {
  return OFFLINE_SYNC_SERVER_SNAPSHOT;
}

/**
 * Mount once per app shell. Starts automatic online flush and exposes sync UI helpers.
 */
export function OfflineSyncProvider({
  app,
  children,
  seedDemo = false,
}: {
  app: OfflineSyncApp;
  children: ReactNode;
  /** Admin only — seeds demo queue once. */
  seedDemo?: boolean;
}) {
  useEffect(() => {
    if (seedDemo) ensureOfflineQueueDemoSeed();
    return startAutomaticOfflineSync(app);
  }, [app, seedDemo]);

  const snapshot = useSyncExternalStore(
    subscribe,
    () => getOfflineSyncSnapshot(app),
    () => getServerSnapshot(app),
  );

  const syncNow = useCallback(async () => {
    await flushOfflineQueue(app);
  }, [app]);

  const retryFailed = useCallback(async () => {
    await retryFailedOfflineSync(app);
  }, [app]);

  const value = useMemo(
    () => ({ app, snapshot, syncNow, retryFailed }),
    [app, snapshot, syncNow, retryFailed],
  );

  return (
    <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>
  );
}

export function useOfflineSync(): OfflineSyncContextValue {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) {
    throw new Error("useOfflineSync must be used within OfflineSyncProvider");
  }
  return ctx;
}

export function useOfflineSyncOptional(): OfflineSyncContextValue | null {
  return useContext(OfflineSyncContext);
}

/** Fixed offline banner with the required copy. */
export function OfflineBanner({ className }: { className?: string }) {
  const ctx = useOfflineSyncOptional();
  const online = useSyncExternalStore(
    subscribe,
    () => (ctx ? getOfflineSyncSnapshot(ctx.app).online : typeof navigator === "undefined" ? true : navigator.onLine),
    () => true,
  );

  if (online) return null;

  const [title, body] = OFFLINE_COPY.split("\n");

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "border-b border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-950 dark:text-amber-100",
        className,
      )}
    >
      <div className="mx-auto flex max-w-5xl items-start gap-2">
        <span className="mt-0.5 size-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
        <div>
          <div className="font-semibold leading-tight">{title}</div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-amber-950/80 dark:text-amber-100/80">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Pending Sync badge — shows count of queued + failed items. */
export function PendingSyncBadge({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  const ctx = useOfflineSyncOptional();
  const snap = useSyncExternalStore(
    subscribe,
    () => getOfflineSyncSnapshot(ctx?.app),
    () => getServerSnapshot(ctx?.app ?? "connect"),
  );

  const count = snap.pending + snap.failed;
  if (count <= 0) return null;

  const Comp = onClick ? "button" : "span";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-950 dark:text-amber-100",
        onClick && "cursor-pointer hover:bg-amber-500/25",
        className,
      )}
      aria-label={`${count} pending sync`}
    >
      Pending Sync
      <span className="rounded-full bg-amber-600/90 px-1.5 py-px text-[10px] text-white">
        {count}
      </span>
    </Comp>
  );
}

/**
 * Sync progress / success / retry strip.
 * Shows while syncing, on success, or when failed items need retry.
 */
export function OfflineSyncProgress({ className }: { className?: string }) {
  const ctx = useOfflineSyncOptional();
  const snap = useSyncExternalStore(
    subscribe,
    () => getOfflineSyncSnapshot(ctx?.app),
    () => getServerSnapshot(ctx?.app ?? "connect"),
  );

  const showError =
    snap.phase === "error" || (snap.failed > 0 && snap.phase !== "syncing" && snap.phase !== "success");
  const show =
    snap.phase === "syncing" || snap.phase === "success" || showError;

  if (!show) return null;

  const pct =
    snap.progressTotal > 0
      ? Math.round((snap.progressCurrent / snap.progressTotal) * 100)
      : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "border-b px-4 py-2 text-sm",
        snap.phase === "success" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100",
        showError && "border-destructive/30 bg-destructive/10 text-destructive",
        snap.phase === "syncing" && "border-border bg-muted/60 text-foreground",
        className,
      )}
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-medium leading-tight">
            {snap.phase === "syncing"
              ? snap.lastMessage ?? "Syncing…"
              : snap.phase === "success"
                ? snap.lastMessage ?? "All changes synced successfully."
                : snap.lastMessage ?? `${snap.failed} change(s) failed to sync.`}
          </div>
          {snap.phase === "syncing" && snap.progressTotal > 0 ? (
            <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-background/60">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
          ) : null}
        </div>
        {showError ? (
          <button
            type="button"
            className="shrink-0 rounded-md border border-current/30 bg-background/50 px-3 py-1.5 text-xs font-semibold hover:bg-background"
            onClick={() => void ctx?.retryFailed()}
          >
            Retry failed sync
          </button>
        ) : null}
        {snap.phase !== "syncing" && snap.pending > 0 && snap.online ? (
          <button
            type="button"
            className="shrink-0 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
            onClick={() => void ctx?.syncNow()}
          >
            Sync now
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Convenience host: provider + optional top status strips. */
export function OfflineSyncHost({
  app,
  children,
  seedDemo = false,
  className,
  topStatus = true,
}: {
  app: OfflineSyncApp;
  children: ReactNode;
  seedDemo?: boolean;
  className?: string;
  /** When false, the app chrome should render OfflineBanner / OfflineSyncProgress below its header. */
  topStatus?: boolean;
}) {
  return (
    <OfflineSyncProvider app={app} seedDemo={seedDemo}>
      <div className={cn("flex min-h-0 w-full flex-col", className)}>
        {topStatus ? (
          <>
            <OfflineBanner />
            <OfflineSyncProgress />
          </>
        ) : null}
        <div className="min-h-0 min-w-0 flex-1">{children}</div>
      </div>
    </OfflineSyncProvider>
  );
}
