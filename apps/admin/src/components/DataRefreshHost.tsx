import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { isOnline } from "@lumenx/utils";
import {
  subscribeDataRefresh,
  getDataRefreshGeneration,
} from "@/lib/data-refresh";
import { invalidateAdminSoftRefresh } from "@/lib/admin-queries/invalidate";
import { useInstituteContext } from "@/lib/institutes";

/** Match typical stale windows — resume does not invalidate while data is still fresh. */
const AUTO_MIN_INTERVAL_MS = 45_000;

/**
 * Soft-refreshes page data when the app resumes or the tab becomes visible.
 * Invalidates Admin TanStack Query caches for the active institute only
 * (does not remount chrome). Skips work while offline.
 *
 * Manual pull-to-refresh bumps the soft-refresh generation (imperative loaders).
 * Auto resume only invalidates React Query in the background — no generation bump.
 */
export function DataRefreshHost() {
  const queryClient = useQueryClient();
  const instituteCtx = useInstituteContext();
  const instituteIdRef = useRef(instituteCtx.activeInstituteId);
  instituteIdRef.current = instituteCtx.activeInstituteId;
  const lastAutoAt = useRef(0);
  const lastGen = useRef(getDataRefreshGeneration());

  useEffect(() => {
    return subscribeDataRefresh(() => {
      if (!isOnline()) return;
      const gen = getDataRefreshGeneration();
      if (gen === lastGen.current) return;
      lastGen.current = gen;
      void invalidateAdminSoftRefresh(queryClient, instituteIdRef.current);
    });
  }, [queryClient]);

  useEffect(() => {
    const maybeAutoRefresh = () => {
      if (!isOnline()) return;
      const now = Date.now();
      if (now - lastAutoAt.current < AUTO_MIN_INTERVAL_MS) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      lastAutoAt.current = now;
      // Background RQ refetch only — do not bump useReloadKey.
      void invalidateAdminSoftRefresh(queryClient, instituteIdRef.current);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") maybeAutoRefresh();
    };

    const onFocus = () => maybeAutoRefresh();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    let resumeHandle: { remove: () => Promise<void> } | undefined;
    let disposed = false;

    if (Capacitor.isNativePlatform()) {
      void App.addListener("resume", () => {
        maybeAutoRefresh();
      }).then((handle) => {
        if (disposed) {
          void handle.remove();
          return;
        }
        resumeHandle = handle;
      });
    }

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      void resumeHandle?.remove();
    };
  }, [queryClient]);

  return null;
}
