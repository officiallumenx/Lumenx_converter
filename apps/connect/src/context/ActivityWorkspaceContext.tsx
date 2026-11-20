import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/lib/app-state";
import { useTeacherPortalAccess } from "@/lib/teacher-session";
import { activityRepository } from "@/lib/activity/repositories";
import { connectQueryKeys, scopedConnectKey } from "@/lib/connect-queries";
import { useConnectQueryRestoring } from "@/lib/connect-queries/PersistProvider";
import { useConnectQueryUserId } from "@/lib/connect-queries/use-connect-query-user";
import { prefetchActivityModuleQueries } from "@/lib/connect-queries/prefetch-activity";
import { isInstituteUuid } from "@/lib/institute-id";
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
  const { role, activeInstituteId, user } = useApp();
  const access = useTeacherPortalAccess();
  const queryClient = useQueryClient();
  const userId = useConnectQueryUserId();
  const isRestoring = useConnectQueryRestoring();

  const isActive =
    role === "teacher" &&
    (access.isActivityWorkspaceActive ?? access.isActivityPortalActive);

  const canRun =
    isActive &&
    Boolean(user?.id) &&
    Boolean(activeInstituteId) &&
    isInstituteUuid(activeInstituteId ?? "");

  const query = useQuery({
    queryKey: scopedConnectKey(
      userId,
      connectQueryKeys.activityWorkspace(activeInstituteId ?? "_"),
    ),
    queryFn: () => activityRepository.getDashboard(),
    enabled: canRun && !isRestoring,
  });

  useEffect(() => {
    if (isActive) return;
    queryClient.removeQueries({ queryKey: ["activity-workspace"] });
  }, [isActive, queryClient]);

  useEffect(() => {
    if (!canRun || isRestoring || !activeInstituteId) return;
    prefetchActivityModuleQueries(queryClient, userId, activeInstituteId);
  }, [canRun, isRestoring, activeInstituteId, queryClient, userId]);

  const refresh = useCallback(() => {
    if (!activeInstituteId) return;
    void queryClient.invalidateQueries({
      queryKey: scopedConnectKey(
        userId,
        connectQueryKeys.activityWorkspace(activeInstituteId),
      ),
    });
  }, [activeInstituteId, queryClient, userId]);

  const dashboard = query.data ?? null;
  // Match teacher/student portals: treat IndexedDB restore as loading.
  const isLoading =
    isActive &&
    (isRestoring || (canRun && query.isLoading && !dashboard));

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
