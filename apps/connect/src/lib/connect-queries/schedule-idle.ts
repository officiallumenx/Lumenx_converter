/**
 * Idle-friendly scheduling for progressive Connect module warming.
 * Cancels remaining work when the user navigates or the portal identity changes.
 */

export type IdleCancel = () => void;

type IdleDeadlineLike = { timeRemaining: () => number; didTimeout: boolean };

type IdleWindow = Window & {
  requestIdleCallback?: (
    cb: (deadline: IdleDeadlineLike) => void,
    opts?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (id: number) => void;
};

function getIdleWindow(): IdleWindow | null {
  if (typeof window === "undefined") return null;
  return window as IdleWindow;
}

/**
 * Run `task` when the browser is idle (or after a short timeout fallback).
 * Returns a cancel function that prevents the task from starting.
 */
export function scheduleIdle(task: () => void, timeoutMs = 1200): IdleCancel {
  const w = getIdleWindow();
  let cancelled = false;
  let idleId: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const run = () => {
    if (cancelled) return;
    task();
  };

  if (w?.requestIdleCallback) {
    idleId = w.requestIdleCallback(
      () => {
        idleId = null;
        run();
      },
      { timeout: timeoutMs },
    );
  } else {
    timeoutId = setTimeout(run, Math.min(timeoutMs, 200));
  }

  return () => {
    cancelled = true;
    if (idleId != null && w?.cancelIdleCallback) {
      w.cancelIdleCallback(idleId);
      idleId = null;
    }
    if (timeoutId != null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
}

export type PrefetchTier = {
  /** Immediate warm (high-priority modules for the active role). */
  critical: Array<() => void>;
  /** Deferred until idle; cancelled when identity/nav changes. */
  deferred: Array<() => void>;
};

/**
 * Run critical prefetchers immediately, then deferred ones one-at-a-time on idle.
 * Avoids starting duplicate deferred work for the same cancel token lifecycle.
 */
export function runPrefetchTiers(tiers: PrefetchTier): IdleCancel {
  for (const fn of tiers.critical) {
    try {
      fn();
    } catch {
      // Prefetch failures must never block the portal shell.
    }
  }

  const deferred = [...tiers.deferred];
  let cancelled = false;
  let cancelIdle: IdleCancel | null = null;

  const pump = () => {
    if (cancelled) return;
    const next = deferred.shift();
    if (!next) return;
    try {
      next();
    } catch {
      // ignore
    }
    if (deferred.length > 0 && !cancelled) {
      cancelIdle = scheduleIdle(pump);
    }
  };

  if (deferred.length > 0) {
    cancelIdle = scheduleIdle(pump);
  }

  return () => {
    cancelled = true;
    cancelIdle?.();
    deferred.length = 0;
  };
}
