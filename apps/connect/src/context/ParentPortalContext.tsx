import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import { fetchParentPortalSnapshot, parentPortalQueryKeys } from "@/api/parent-portal";
import { connectQueryKeys, scopedConnectKey } from "@/lib/connect-queries";
import { useConnectQueryUserId } from "@/lib/connect-queries/use-connect-query-user";
import { useConnectQueryRestoring } from "@/lib/connect-queries/PersistProvider";
import { prefetchParentModuleQueries } from "@/lib/connect-queries/prefetch-parent";
import { loadConnectPortalInbox } from "@/lib/connect-inbox/load";
import type { ParentPortalSnapshot } from "@/lib/parent-portal-data";
import type { AppNotification } from "@lumenx/types";

/** Flat shape so consumers can read fields without brittle discriminant narrowing. */
export type ParentPortalState = {
  isParent: boolean;
  /** Safe to render: hidden while loading a *different* child to avoid cross-child flash. */
  snapshot: ParentPortalSnapshot | null;
  isLoading: boolean;
  activeChildId: string;
  instituteId: string | null;
  queryKey: readonly unknown[];
};

const ParentPortalCtx = createContext<ParentPortalState | undefined>(undefined);

/**
 * Parent scoped data via TanStack Query.
 * Keeps previous snapshot visible during same-child refetch; hides data only when the
 * active learner changes until the new payload arrives.
 */
export function ParentPortalRegistry({ children }: { children: ReactNode }) {
  const { role, activeChildId, activeInstituteId, user } = useApp();
  const queryClient = useQueryClient();
  const isRestoring = useConnectQueryRestoring();
  const userId = useConnectQueryUserId();
  const isParent = role === "parent";
  const canRun =
    isParent &&
    isApiAuthMode() &&
    Boolean(user?.id) &&
    Boolean(activeInstituteId) &&
    isInstituteUuid(activeInstituteId ?? "") &&
    Boolean(activeChildId) &&
    isInstituteUuid(activeChildId);

  const queryKey = scopedConnectKey(
    userId,
    connectQueryKeys.parentPortal(activeInstituteId ?? "_", activeChildId || "_"),
  );

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      // Share inbox with the shell badge query — start ensure in parallel with snapshot work.
      const inboxPromise = queryClient.ensureQueryData({
        queryKey: scopedConnectKey(
          userId,
          connectQueryKeys.inbox(activeInstituteId!, "parent"),
        ),
        queryFn: () => loadConnectPortalInbox(activeInstituteId!),
      }) as Promise<AppNotification[]>;
      return fetchParentPortalSnapshot(activeInstituteId!, activeChildId, signal, {
        inbox: inboxPromise,
      });
    },
    // Wait for IDB hydrate so warm reopen paints from cache, not an empty race.
    enabled: canRun && !isRestoring,
    placeholderData: (previous) => {
      if (!previous) return undefined;
      if (previous.child.id === activeChildId) return previous;
      return undefined;
    },
  });

  useEffect(() => {
    if (isParent) return;
    queryClient.removeQueries({ queryKey: ["parent-portal"] });
  }, [isParent, queryClient]);

  const cached = query.data ?? null;
  const isFetchingNewChild =
    Boolean(cached) && cached!.child.id !== activeChildId && query.isFetching;

  const snapshot = useMemo(() => {
    if (!isParent) return null;
    if (!cached) return null;
    if (isFetchingNewChild) return null;
    if (cached.child.id !== activeChildId && query.isLoading) return null;
    return cached.child.id === activeChildId ? cached : null;
  }, [isParent, cached, activeChildId, isFetchingNewChild, query.isLoading]);

  // Treat IndexedDB restore as loading so child portals do not flash empty state.
  const isLoading =
    isParent &&
    (isRestoring ||
      (canRun && ((query.isLoading && !snapshot) || isFetchingNewChild)));

  // Warm common parent modules once the active child snapshot is ready.
  useEffect(() => {
    if (!isParent || isRestoring || !snapshot || !activeInstituteId || !activeChildId) {
      return;
    }
    if (!isInstituteUuid(activeInstituteId) || !isInstituteUuid(activeChildId)) return;
    return prefetchParentModuleQueries(
      queryClient,
      userId,
      activeInstituteId,
      activeChildId,
    );
  }, [
    isParent,
    isRestoring,
    snapshot,
    activeInstituteId,
    activeChildId,
    queryClient,
    userId,
  ]);

  const value = useMemo<ParentPortalState>(() => {
    if (!isParent) {
      return {
        isParent: false,
        snapshot: null,
        isLoading: false,
        activeChildId,
        instituteId: activeInstituteId,
        queryKey: parentPortalQueryKeys.snapshot(activeInstituteId, activeChildId),
      };
    }
    return {
      isParent: true,
      snapshot,
      isLoading: !activeInstituteId || !activeChildId ? false : isLoading,
      activeChildId,
      instituteId: activeInstituteId,
      queryKey: parentPortalQueryKeys.snapshot(activeInstituteId, activeChildId),
    };
  }, [isParent, snapshot, isLoading, activeChildId, activeInstituteId]);

  return <ParentPortalCtx.Provider value={value}>{children}</ParentPortalCtx.Provider>;
}

export function useParentPortal(): ParentPortalState {
  const v = useContext(ParentPortalCtx);
  if (!v) throw new Error("useParentPortal must be used under ParentPortalRegistry");
  return v;
}
