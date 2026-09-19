import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import { fetchParentPortalSnapshot, parentPortalQueryKeys } from "@/api/parent-portal";
import { connectQueryKeys } from "@/lib/connect-queries";
import type { ParentPortalSnapshot } from "@/lib/parent-portal-data";

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
  const { role, activeChildId, activeInstituteId } = useApp();
  const queryClient = useQueryClient();
  const isParent = role === "parent";
  const canRun =
    isParent &&
    isApiAuthMode() &&
    Boolean(activeInstituteId) &&
    isInstituteUuid(activeInstituteId ?? "") &&
    Boolean(activeChildId) &&
    isInstituteUuid(activeChildId);

  const queryKey = connectQueryKeys.parentPortal(
    activeInstituteId ?? "_",
    activeChildId || "_",
  );

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      fetchParentPortalSnapshot(activeInstituteId!, activeChildId, signal),
    enabled: canRun,
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

  const isLoading =
    isParent &&
    canRun &&
    ((query.isLoading && !snapshot) || isFetchingNewChild);

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
