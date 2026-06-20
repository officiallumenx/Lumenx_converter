import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useApp } from "@/lib/app-state";
import { fetchParentPortalSnapshot, parentPortalQueryKeys } from "@/api/parent-portal";
import type { ParentPortalSnapshot } from "@/lib/parent-portal-data";

export type ParentPortalState =
  | { isParent: false }
  | {
      isParent: true;
      /** Safe to render: hidden while loading a *different* child to avoid cross-child flash. */
      snapshot: ParentPortalSnapshot | null;
      isLoading: boolean;
      activeChildId: string;
      instituteId: string | null;
      queryKey: readonly unknown[];
    };

const ParentPortalCtx = createContext<ParentPortalState | undefined>(undefined);

/**
 * Single subscription for parent scoped data. Keeps the previous snapshot visible during
 * same-child refetch; hides data only when the active learner changes until the new payload arrives.
 */
export function ParentPortalRegistry({ children }: { children: ReactNode }) {
  const { role, activeChildId, activeInstituteId } = useApp();
  const [cached, setCached] = useState<ParentPortalSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const seq = useRef(0);
  const activeChildRef = useRef(activeChildId);
  activeChildRef.current = activeChildId;

  const snapshot = useMemo(() => {
    if (role !== "parent") return null;
    if (!cached) return null;
    if (isLoading && cached.child.id !== activeChildId) return null;
    return cached;
  }, [role, cached, isLoading, activeChildId]);

  useEffect(() => {
    if (role !== "parent") {
      setCached(null);
      setIsLoading(false);
      return;
    }

    const my = ++seq.current;
    const ac = new AbortController();
    setIsLoading(true);

    fetchParentPortalSnapshot(activeInstituteId, activeChildId, ac.signal)
      .then((data) => {
        if (seq.current !== my) return;
        if (data.child.id !== activeChildRef.current) return;
        setCached(data);
        setIsLoading(false);
      })
      .catch((e: unknown) => {
        if (seq.current !== my) return;
        if (e instanceof DOMException && e.name === "AbortError") {
          setIsLoading(false);
          return;
        }
        setIsLoading(false);
        setCached((prev) => (prev && prev.child.id === activeChildRef.current ? prev : null));
      });

    return () => ac.abort();
  }, [role, activeChildId, activeInstituteId]);

  const value = useMemo<ParentPortalState>(() => {
    if (role !== "parent") return { isParent: false };
    return {
      isParent: true,
      snapshot,
      isLoading,
      activeChildId,
      instituteId: activeInstituteId,
      queryKey: parentPortalQueryKeys.snapshot(activeInstituteId, activeChildId),
    };
  }, [role, snapshot, isLoading, activeChildId, activeInstituteId]);

  return <ParentPortalCtx.Provider value={value}>{children}</ParentPortalCtx.Provider>;
}

export function useParentPortal(): ParentPortalState {
  const v = useContext(ParentPortalCtx);
  if (!v) throw new Error("useParentPortal must be used under ParentPortalRegistry");
  return v;
}
