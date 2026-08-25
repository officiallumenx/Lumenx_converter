import { useEffect, useRef } from "react";

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function debugLog(message: string): void {
  if (!import.meta.env.DEV) return;
  // eslint-disable-next-line no-console
  console.debug(message);
}

/**
 * Tracks route-level navigation busy windows and emits development timing logs.
 */
export function useAdminRouteTransitionTrace(pathname: string, busy: boolean): void {
  const startMsRef = useRef<number | null>(null);
  const fromPathRef = useRef(pathname);

  useEffect(() => {
    if (busy) {
      if (startMsRef.current == null) {
        startMsRef.current = nowMs();
        fromPathRef.current = pathname;
      }
      return;
    }

    if (startMsRef.current == null) return;
    const duration = nowMs() - startMsRef.current;
    debugLog(
      `[admin-perf] route-transition ${fromPathRef.current} -> ${pathname} in ${duration.toFixed(1)}ms`,
    );
    startMsRef.current = null;
  }, [busy, pathname]);
}

/**
 * Logs one-time render mount cost for high-level shells.
 */
export function useAdminMountTrace(label: string): void {
  const startRef = useRef(nowMs());
  useEffect(() => {
    const duration = nowMs() - startRef.current;
    debugLog(`[admin-perf] mount ${label} in ${duration.toFixed(1)}ms`);
  }, [label]);
}
