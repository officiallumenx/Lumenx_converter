import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import {
  requestDataRefresh,
  subscribeDataRefresh,
  getDataRefreshGeneration,
} from "@/lib/data-refresh";
import { invalidateAdminSoftRefresh } from "@/lib/admin-queries/invalidate";

const AUTO_MIN_INTERVAL_MS = 45_000;

/**
 * Soft-refreshes page data when the app resumes or the tab becomes visible.
 * Invalidates Admin TanStack Query caches (does not remount chrome).
 */
export function DataRefreshHost() {
  const queryClient = useQueryClient();
  const lastAutoAt = useRef(0);
  const lastGen = useRef(getDataRefreshGeneration());

  useEffect(() => {
    return subscribeDataRefresh(() => {
      const gen = getDataRefreshGeneration();
      if (gen === lastGen.current) return;
      lastGen.current = gen;
      void invalidateAdminSoftRefresh(queryClient);
    });
  }, [queryClient]);

  useEffect(() => {
    const maybeAutoRefresh = () => {
      const now = Date.now();
      if (now - lastAutoAt.current < AUTO_MIN_INTERVAL_MS) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      lastAutoAt.current = now;
      void requestDataRefresh("auto");
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
  }, []);

  return null;
}
