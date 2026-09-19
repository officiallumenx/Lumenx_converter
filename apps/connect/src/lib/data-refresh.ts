/**
 * Soft data refresh — bumps a generation so list loaders re-fetch
 * without remounting chrome / routes / splash.
 */

export type DataRefreshPhase = "idle" | "refreshing";

export type DataRefreshSnapshot = {
  generation: number;
  phase: DataRefreshPhase;
  lastRefreshedAt: number | null;
  source: "manual" | "auto" | null;
};

const listeners = new Set<() => void>();

let snapshot: DataRefreshSnapshot = {
  generation: 0,
  phase: "idle",
  lastRefreshedAt: null,
  source: null,
};

let refreshInFlight: Promise<void> | null = null;
let refreshDoneTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function setSnapshot(next: DataRefreshSnapshot) {
  snapshot = next;
  emit();
}

export function subscribeDataRefresh(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDataRefreshSnapshot(): DataRefreshSnapshot {
  return snapshot;
}

export function getDataRefreshGeneration(): number {
  return snapshot.generation;
}

/**
 * Request a soft data refresh. Concurrent calls share one in-flight cycle.
 * UI chrome must not remount — only loaders keyed on generation re-run.
 */
export async function requestDataRefresh(
  source: "manual" | "auto" = "manual",
): Promise<void> {
  if (refreshInFlight) return refreshInFlight;

  if (refreshDoneTimer) {
    clearTimeout(refreshDoneTimer);
    refreshDoneTimer = null;
  }

  setSnapshot({
    ...snapshot,
    generation: snapshot.generation + 1,
    phase: "refreshing",
    source,
  });

  refreshInFlight = (async () => {
    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => resolve());
      } else {
        setTimeout(() => resolve(), 0);
      }
    });
    await new Promise<void>((resolve) => {
      refreshDoneTimer = setTimeout(
        () => resolve(),
        source === "manual" ? 450 : 280,
      );
    });
  })().finally(() => {
    refreshInFlight = null;
    refreshDoneTimer = null;
    setSnapshot({
      ...snapshot,
      phase: "idle",
      lastRefreshedAt: Date.now(),
      source: null,
    });
  });

  return refreshInFlight;
}
