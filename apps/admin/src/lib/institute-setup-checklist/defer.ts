/**
 * Decide when Home can skip the immediate 13-API setup checklist fan-out.
 * Expensive recount still runs on idle, /setup visit, force reload, or when
 * the verified snapshot is missing / stale / incomplete.
 */
import type { SetupChecklistState } from "./types";

/** Align with soft in-memory cache window — verified complete is "fresh" this long. */
export const SETUP_VERIFIED_FRESH_MS = 5 * 60_000;

/** Idle timeout so background tabs still recount shortly after Home settles. */
export const SETUP_DEFER_IDLE_TIMEOUT_MS = 2_500;

export function shouldDeferSetupChecklistNetwork(opts: {
  force: boolean;
  cached: SetupChecklistState | null;
  verifiedFresh: boolean;
}): boolean {
  if (opts.force) return false;
  if (opts.cached?.status === "ready" && opts.cached.coreComplete) {
    return true;
  }
  return opts.verifiedFresh;
}

/**
 * Schedule a one-shot idle callback (or timeout fallback).
 * Returns a cancel function; calling run after cancel is a no-op.
 */
export function scheduleDeferredSetupRefresh(
  run: () => void,
  opts?: { timeoutMs?: number },
): () => void {
  const timeoutMs = opts?.timeoutMs ?? SETUP_DEFER_IDLE_TIMEOUT_MS;
  let cancelled = false;
  const safeRun = () => {
    if (cancelled) return;
    cancelled = true;
    run();
  };

  type IdleHost = {
    requestIdleCallback?: (
      cb: () => void,
      options?: { timeout: number },
    ) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const host = globalThis as typeof globalThis & IdleHost;

  if (typeof host.requestIdleCallback === "function") {
    const id = host.requestIdleCallback(safeRun, { timeout: timeoutMs });
    return () => {
      cancelled = true;
      host.cancelIdleCallback?.(id);
    };
  }

  const timer = setTimeout(safeRun, timeoutMs);
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}

/** Placeholder ready+complete state while a deferred recount is pending. */
export function verifiedCompletePlaceholderState(): SetupChecklistState {
  return {
    status: "ready",
    errorMessage: null,
    counts: null,
    steps: [],
    coreDone: 0,
    coreTotal: 0,
    extendedDone: 0,
    extendedTotal: 0,
    coreComplete: true,
  };
}
