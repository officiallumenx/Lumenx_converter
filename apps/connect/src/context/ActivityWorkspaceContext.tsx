import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useApp } from "@/lib/app-state";
import { useTeacherPortalAccess } from "@/lib/teacher-session";
import { activityRepository } from "@/lib/activity/repositories";
import type { ActivityDashboardSnapshot } from "@/lib/activity/types";

export type ActivityWorkspaceState =
  | { isActivityMode: false }
  | {
      isActivityMode: true;
      dashboard: ActivityDashboardSnapshot | null;
      isLoading: boolean;
      refresh: () => void;
    };

const ActivityWorkspaceCtx = createContext<ActivityWorkspaceState | undefined>(undefined);

/** Loads Activity Workspace dashboard data when the teacher role is in activity mode. */
export function ActivityWorkspaceRegistry({ children }: { children: ReactNode }) {
  const { role } = useApp();
  const access = useTeacherPortalAccess();
  const [dashboard, setDashboard] = useState<ActivityDashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  const loadedRef = useRef(false);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const isActive =
    role === "teacher" &&
    (access.isActivityWorkspaceActive ?? access.isActivityPortalActive);

  useEffect(() => {
    if (!isActive) {
      loadedRef.current = false;
      setDashboard((d) => (d === null ? d : null));
      setIsLoading((loading) => (loading ? false : loading));
      return;
    }

    const my = ++seq.current;
    const showSpinner = !loadedRef.current;
    if (showSpinner) setIsLoading(true);

    activityRepository
      .getDashboard()
      .then((d) => {
        if (seq.current !== my) return;
        setDashboard(d);
        loadedRef.current = true;
        if (showSpinner) setIsLoading(false);
      })
      .catch(() => {
        if (seq.current !== my) return;
        if (showSpinner) setIsLoading(false);
      });
  }, [isActive, tick]);

  const value = useMemo<ActivityWorkspaceState>(() => {
    if (!isActive) return { isActivityMode: false };
    return {
      isActivityMode: true,
      dashboard,
      isLoading,
      refresh,
    };
  }, [isActive, dashboard, isLoading, refresh]);

  return <ActivityWorkspaceCtx.Provider value={value}>{children}</ActivityWorkspaceCtx.Provider>;
}

export function useActivityWorkspace() {
  const ctx = useContext(ActivityWorkspaceCtx);
  if (!ctx) throw new Error("useActivityWorkspace must be used within ActivityWorkspaceRegistry");
  return ctx;
}

/** @deprecated Use ActivityWorkspaceRegistry */
export const ActivityPortalRegistry = ActivityWorkspaceRegistry;

/** @deprecated Use useActivityWorkspace */
export function useActivityPortal(): ActivityWorkspaceState {
  return useActivityWorkspace();
}

export type ActivityPortalState = ActivityWorkspaceState;
