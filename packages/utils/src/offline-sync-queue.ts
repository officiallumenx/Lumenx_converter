/**
 * Platform-wide Offline Sync engine (frontend-only).
 *
 * Shared by Connect, Admin, and Transport.
 * Stores mutations in a local outbox while offline and flushes when online.
 * No backend — flush simulates successful sync with progress events.
 */

export type OfflineSyncApp = "connect" | "admin" | "transport";

export const OFFLINE_SYNC_QUEUE_KEY = "lumenx.offline-sync-queue.v1";
export const OFFLINE_SYNC_META_KEY = "lumenx.offline-sync-meta.v1";
export const OFFLINE_SYNC_EVENT = "lumenx-offline-sync-changed";

export type OfflineQueueOp =
  | "create"
  | "update"
  | "delete"
  | "submit"
  | "publish"
  | "custom";

export type OfflineQueueItemStatus = "pending" | "failed" | "syncing";

export type OfflineQueueItem = {
  id: string;
  op: OfflineQueueOp;
  module: string;
  label: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError?: string;
  status: OfflineQueueItemStatus;
  /** Owning app — defaults to "admin" for legacy items. */
  app?: OfflineSyncApp;
};

export type OfflineSyncPhase = "idle" | "syncing" | "success" | "error";

export type OfflineSyncMeta = {
  lastSyncedAt: string | null;
  autoSync: boolean;
  lastFlushOk: boolean;
};

export type OfflineSyncSnapshot = {
  online: boolean;
  pending: number;
  failed: number;
  items: OfflineQueueItem[];
  meta: OfflineSyncMeta;
  phase: OfflineSyncPhase;
  progressCurrent: number;
  progressTotal: number;
  lastMessage: string | null;
};

type QueueState = {
  items: OfflineQueueItem[];
};

type Listener = () => void;

const listeners = new Set<Listener>();

/** Cached snapshots for useSyncExternalStore — rebuilt only on notify(). */
const snapshotCache = new Map<string, OfflineSyncSnapshot>();

const EMPTY_QUEUE_ITEMS: OfflineQueueItem[] = [];

/** Stable SSR / no-DOM snapshot (must keep Object.is identity). */
export const OFFLINE_SYNC_SERVER_SNAPSHOT: OfflineSyncSnapshot = {
  online: true,
  pending: 0,
  failed: 0,
  items: EMPTY_QUEUE_ITEMS,
  meta: { lastSyncedAt: null, autoSync: true, lastFlushOk: true },
  phase: "idle",
  progressCurrent: 0,
  progressTotal: 0,
  lastMessage: null,
};

/** In-memory sync UI state (not persisted). */
let runtimePhase: OfflineSyncPhase = "idle";
let runtimeProgressCurrent = 0;
let runtimeProgressTotal = 0;
let runtimeMessage: string | null = null;
let successClearTimer: ReturnType<typeof setTimeout> | null = null;
let flushInFlight: Promise<{
  flushed: number;
  failed: number;
  remaining: number;
  lastSyncedAt: string | null;
}> | null = null;

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / private mode.
  }
}

function invalidateOfflineSnapshots(): void {
  snapshotCache.clear();
}

function notify(): void {
  invalidateOfflineSnapshots();
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_EVENT));
  }
}

function normalizeItem(raw: OfflineQueueItem): OfflineQueueItem {
  return {
    ...raw,
    status: raw.status ?? (raw.lastError ? "failed" : "pending"),
    attempts: typeof raw.attempts === "number" ? raw.attempts : 0,
  };
}

function loadQueue(): QueueState {
  const parsed = readJson<QueueState>(OFFLINE_SYNC_QUEUE_KEY, { items: [] });
  const items = Array.isArray(parsed.items) ? parsed.items.map(normalizeItem) : [];
  return { items };
}

function saveQueue(state: QueueState): void {
  writeJson(OFFLINE_SYNC_QUEUE_KEY, { items: state.items.slice(0, 500) });
  notify();
}

function matchesApp(item: OfflineQueueItem, app?: OfflineSyncApp): boolean {
  if (!app) return true;
  return (item.app ?? "admin") === app;
}

export function loadOfflineSyncMeta(): OfflineSyncMeta {
  return readJson<OfflineSyncMeta>(OFFLINE_SYNC_META_KEY, {
    lastSyncedAt: null,
    autoSync: true,
    lastFlushOk: true,
  });
}

export function saveOfflineSyncMeta(meta: OfflineSyncMeta): void {
  writeJson(OFFLINE_SYNC_META_KEY, meta);
  notify();
}

export function setAutoSync(enabled: boolean): OfflineSyncMeta {
  const next = { ...loadOfflineSyncMeta(), autoSync: enabled };
  saveOfflineSyncMeta(next);
  return next;
}

export function getOfflineQueue(app?: OfflineSyncApp): OfflineQueueItem[] {
  return loadQueue().items.filter((i) => matchesApp(i, app));
}

export function getPendingSyncCount(app?: OfflineSyncApp): number {
  return getOfflineQueue(app).filter((i) => i.status === "pending" || i.status === "syncing")
    .length;
}

export function getFailedSyncCount(app?: OfflineSyncApp): number {
  return getOfflineQueue(app).filter((i) => i.status === "failed").length;
}

export function getLastSyncedAt(): string | null {
  return loadOfflineSyncMeta().lastSyncedAt;
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function setRuntime(
  phase: OfflineSyncPhase,
  opts?: { current?: number; total?: number; message?: string | null },
): void {
  runtimePhase = phase;
  if (opts?.current !== undefined) runtimeProgressCurrent = opts.current;
  if (opts?.total !== undefined) runtimeProgressTotal = opts.total;
  if (opts?.message !== undefined) runtimeMessage = opts.message;
  notify();
}

export function getOfflineSyncSnapshot(app?: OfflineSyncApp): OfflineSyncSnapshot {
  const key = app ?? "all";
  const cached = snapshotCache.get(key);
  if (cached) return cached;

  const items = getOfflineQueue(app);
  const snap: OfflineSyncSnapshot = {
    online: isOnline(),
    pending: items.filter((i) => i.status === "pending" || i.status === "syncing").length,
    failed: items.filter((i) => i.status === "failed").length,
    items,
    meta: loadOfflineSyncMeta(),
    phase: runtimePhase,
    progressCurrent: runtimeProgressCurrent,
    progressTotal: runtimeProgressTotal,
    lastMessage: runtimeMessage,
  };
  snapshotCache.set(key, snap);
  return snap;
}

export function subscribeOfflineSync(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function enqueueOfflineOp(input: {
  op: OfflineQueueOp;
  module: string;
  label: string;
  payload?: Record<string, unknown>;
  app?: OfflineSyncApp;
}): OfflineQueueItem {
  const item: OfflineQueueItem = {
    id: `oq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    op: input.op,
    module: input.module,
    label: input.label,
    payload: input.payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: "pending",
    app: input.app ?? "admin",
  };
  const state = loadQueue();
  state.items = [item, ...state.items];
  saveQueue(state);

  const meta = loadOfflineSyncMeta();
  if (meta.autoSync && isOnline()) {
    void flushOfflineQueue(input.app);
  }
  return item;
}

/**
 * Run an action online, or queue it locally when offline.
 * Frontend-only: onlineFn is the local apply path (no network backend).
 */
export async function runOrQueueOffline<T>(input: {
  app: OfflineSyncApp;
  op: OfflineQueueOp;
  module: string;
  label: string;
  payload?: Record<string, unknown>;
  onlineFn: () => Promise<T> | T;
}): Promise<{ queued: boolean; result?: T; item?: OfflineQueueItem }> {
  if (!isOnline()) {
    const item = enqueueOfflineOp({
      op: input.op,
      module: input.module,
      label: input.label,
      payload: input.payload,
      app: input.app,
    });
    return { queued: true, item };
  }
  const result = await input.onlineFn();
  return { queued: false, result };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Flush pending items with progress.
 * Demo: simulates per-item sync. Items with `payload.forceFail` fail unless retried.
 * Legacy demo items with `lastError` and `status: failed` stay failed until retry.
 */
export async function flushOfflineQueue(
  app?: OfflineSyncApp,
  opts?: { includeFailed?: boolean },
): Promise<{
  flushed: number;
  failed: number;
  remaining: number;
  lastSyncedAt: string | null;
}> {
  if (flushInFlight) return flushInFlight;

  flushInFlight = (async () => {
    if (!isOnline()) {
      setRuntime("idle", {
        message: "You're offline. Changes will sync automatically when internet is available.",
      });
      return {
        flushed: 0,
        failed: getFailedSyncCount(app),
        remaining: getPendingSyncCount(app),
        lastSyncedAt: getLastSyncedAt(),
      };
    }

    const queue = loadQueue();
    const toProcess = queue.items.filter((item) => {
      if (!matchesApp(item, app)) return false;
      if (opts?.includeFailed) return item.status === "pending" || item.status === "failed";
      return item.status === "pending";
    });

    if (toProcess.length === 0) {
      const failedLeft = getFailedSyncCount(app);
      if (failedLeft > 0) {
        setRuntime("error", {
          current: 0,
          total: 0,
          message: `${failedLeft} change(s) failed. Tap Retry to try again.`,
        });
      } else {
        setRuntime("idle", { current: 0, total: 0, message: null });
      }
      return {
        flushed: 0,
        failed: failedLeft,
        remaining: failedLeft,
        lastSyncedAt: getLastSyncedAt(),
      };
    }

    if (successClearTimer) {
      clearTimeout(successClearTimer);
      successClearTimer = null;
    }

    setRuntime("syncing", {
      current: 0,
      total: toProcess.length,
      message: `Syncing 0 of ${toProcess.length}…`,
    });

    let okCount = 0;
    let failCount = 0;
    let items = queue.items.slice();

    for (let i = 0; i < toProcess.length; i++) {
      const target = toProcess[i]!;
      const idx = items.findIndex((r) => r.id === target.id);
      if (idx === -1) continue;

      items[idx] = { ...items[idx]!, status: "syncing" };
      saveQueue({ items });
      setRuntime("syncing", {
        current: i + 1,
        total: toProcess.length,
        message: `Syncing ${i + 1} of ${toProcess.length}…`,
      });
      await delay(260);

      // Fail only when explicitly marked and this is not a retry pass.
      const shouldFail = Boolean(target.payload?.forceFail) && !opts?.includeFailed;

      if (shouldFail) {
        items[idx] = {
          ...items[idx]!,
          status: "failed",
          attempts: items[idx]!.attempts + 1,
          lastError: "Sync failed",
        };
        failCount += 1;
      } else {
        items = items.filter((r) => r.id !== target.id);
        okCount += 1;
      }
      saveQueue({ items });
    }

    const lastSyncedAt =
      okCount > 0 ? new Date().toISOString() : loadOfflineSyncMeta().lastSyncedAt;
    const remainingFailed = items.filter(
      (i) => matchesApp(i, app) && i.status === "failed",
    ).length;
    const remainingPending = items.filter(
      (i) => matchesApp(i, app) && (i.status === "pending" || i.status === "syncing"),
    ).length;

    saveOfflineSyncMeta({
      ...loadOfflineSyncMeta(),
      lastSyncedAt,
      lastFlushOk: remainingFailed === 0,
    });

    if (remainingFailed > 0) {
      setRuntime("error", {
        current: okCount,
        total: toProcess.length,
        message: `${remainingFailed} change(s) failed. Tap Retry to try again.`,
      });
    } else if (okCount > 0) {
      setRuntime("success", {
        current: okCount,
        total: toProcess.length,
        message: "All changes synced successfully.",
      });
      if (typeof window !== "undefined") {
        successClearTimer = setTimeout(() => {
          if (runtimePhase === "success") {
            setRuntime("idle", { message: null, current: 0, total: 0 });
          }
        }, 3200);
      }
    } else {
      setRuntime("idle", { message: null, current: 0, total: 0 });
    }

    void failCount;

    return {
      flushed: okCount,
      failed: remainingFailed,
      remaining: remainingPending + remainingFailed,
      lastSyncedAt,
    };
  })();

  try {
    return await flushInFlight;
  } finally {
    flushInFlight = null;
  }
}

/** Retry all failed items (clears forceFail) and flush. */
export async function retryFailedOfflineSync(app?: OfflineSyncApp) {
  const state = loadQueue();
  state.items = state.items.map((item) => {
    if (!matchesApp(item, app) || item.status !== "failed") return item;
    const payload = { ...(item.payload ?? {}) };
    delete payload.forceFail;
    return {
      ...item,
      status: "pending" as const,
      lastError: undefined,
      payload: Object.keys(payload).length ? payload : undefined,
    };
  });
  saveQueue(state);
  return flushOfflineQueue(app, { includeFailed: true });
}

/** Seed a few pending ops once so Admin UI can demonstrate the queue. */
export function ensureOfflineQueueDemoSeed(): void {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(OFFLINE_SYNC_QUEUE_KEY)) return;
  const now = Date.now();
  saveQueue({
    items: [
      {
        id: `oq-demo-1`,
        op: "submit",
        module: "Attendance",
        label: "Submit attendance · 10-B",
        createdAt: new Date(now - 120_000).toISOString(),
        attempts: 0,
        status: "pending",
        app: "admin",
      },
      {
        id: `oq-demo-2`,
        op: "publish",
        module: "Homework",
        label: "Publish homework · Algebra worksheet",
        createdAt: new Date(now - 300_000).toISOString(),
        attempts: 1,
        lastError: "Network timeout",
        status: "failed",
        payload: { forceFail: true },
        app: "admin",
      },
    ],
  });
  if (!localStorage.getItem(OFFLINE_SYNC_META_KEY)) {
    saveOfflineSyncMeta({
      lastSyncedAt: new Date(now - 3_600_000).toISOString(),
      autoSync: true,
      lastFlushOk: true,
    });
  }
}

/**
 * Convenience: when offline, enqueue a pending sync item; when online, no-op
 * (caller already applied the local change). Use after any local mutation.
 */
export function recordLocalChangeForSync(input: {
  app: OfflineSyncApp;
  module: string;
  label: string;
  op?: OfflineQueueOp;
  payload?: Record<string, unknown>;
}): OfflineQueueItem | null {
  if (isOnline()) return null;
  return enqueueOfflineOp({
    op: input.op ?? "update",
    module: input.module,
    label: input.label,
    payload: input.payload,
    app: input.app,
  });
}

/** Attach online/offline listeners for automatic sync (call once from app shell). */
export function startAutomaticOfflineSync(app?: OfflineSyncApp): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onOnline = () => {
    notify();
    if (loadOfflineSyncMeta().autoSync) void flushOfflineQueue(app);
  };
  const onOffline = () => {
    setRuntime("idle", {
      message: "You're offline. Changes will sync automatically when internet is available.",
    });
  };

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  if (!navigator.onLine) {
    onOffline();
  } else if (loadOfflineSyncMeta().autoSync && getPendingSyncCount(app) > 0) {
    void flushOfflineQueue(app);
  }

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}
