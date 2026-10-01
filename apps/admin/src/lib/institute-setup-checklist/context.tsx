/**
 * Shared setup checklist state for /setup, home banner, and nav gating.
 * Soft-refreshes so returning to the checklist does not flash a full reload.
 * Loading / error never lock Admin; only verified ready+!coreComplete does.
 */
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useDataRefreshGeneration } from "@/hooks/useReloadKey";
import { useInstituteContext } from "@/lib/institutes";
import { buildSetupNavGate, emptySetupNavGate } from "./gate";
import {
  invalidateSetupChecklistCache,
  loadSetupChecklist,
  peekSetupChecklistCache,
  readVerifiedSetupCoreComplete,
} from "./load";
import { setSetupNavGate } from "./session";
import type { SetupChecklistState } from "./types";

function emptyLoading(): SetupChecklistState {
  return {
    status: "loading",
    errorMessage: null,
    counts: null,
    steps: [],
    coreDone: 0,
    coreTotal: 0,
    extendedDone: 0,
    extendedTotal: 0,
    coreComplete: false,
  };
}

/**
 * Keep a verified-complete checklist on screen across transient load errors.
 * A successful ready+incomplete recount is authoritative (core APIs hard-fail,
 * so empty counts are real, not soft-fail poison).
 */
export function shouldRetainPreviousComplete(
  prev: SetupChecklistState,
  next: SetupChecklistState,
  _allowIncompleteDowngrade: boolean,
): boolean {
  if (prev.status !== "ready" || !prev.coreComplete) return false;
  if (next.status === "error") return true;
  return false;
}

export type SetupChecklistContextValue = {
  state: SetupChecklistState;
  reload: (opts?: { force?: boolean }) => Promise<void>;
};

const SetupChecklistReactContext =
  createContext<SetupChecklistContextValue | null>(null);

export function SetupChecklistProvider({ children }: { children: ReactNode }) {
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const dataRefreshGeneration = useDataRefreshGeneration();
  const [state, setState] = useState<SetupChecklistState>(() => {
    if (
      apiMode &&
      instituteCtx.activeInstituteId &&
      instituteCtx.status === "ready"
    ) {
      const cached = peekSetupChecklistCache(instituteCtx.activeInstituteId);
      if (cached) return cached;
      // Fast path: previously verified complete — unlock while background verifies.
      if (readVerifiedSetupCoreComplete(instituteCtx.activeInstituteId)) {
        return {
          ...emptyLoading(),
          coreComplete: true,
        };
      }
      return emptyLoading();
    }
    return emptyLoading();
  });
  const activeIdRef = useRef(instituteCtx.activeInstituteId);
  activeIdRef.current = instituteCtx.activeInstituteId;
  const refreshGenRef = useRef(dataRefreshGeneration);
  const allowIncompleteDowngradeRef = useRef(false);

  const reload = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!apiMode) {
        setState({
          ...emptyLoading(),
          status: "error",
          errorMessage: "Setup checklist requires live institute data.",
        });
        return;
      }
      const instituteId = activeIdRef.current;
      if (!instituteId) {
        setState({ ...emptyLoading(), status: "needs_institute" });
        return;
      }
      if (opts?.force) {
        invalidateSetupChecklistCache(instituteId);
        allowIncompleteDowngradeRef.current = true;
      }
      const next = await loadSetupChecklist(instituteId, opts);
      if (activeIdRef.current !== instituteId) return;
      setState((prev) => {
        if (
          shouldRetainPreviousComplete(
            prev,
            next,
            allowIncompleteDowngradeRef.current,
          )
        ) {
          return prev;
        }
        allowIncompleteDowngradeRef.current = false;
        return next;
      });
    },
    [apiMode],
  );

  useEffect(() => {
    if (!apiMode) {
      setState({
        ...emptyLoading(),
        status: "error",
        errorMessage: "Setup checklist requires live institute data.",
      });
      setSetupNavGate(buildSetupNavGate(null));
      return;
    }

    if (instituteCtx.status === "loading") {
      setState((prev) =>
        prev.status === "ready" || prev.coreComplete ? prev : emptyLoading(),
      );
      if (
        instituteCtx.activeInstituteId &&
        readVerifiedSetupCoreComplete(instituteCtx.activeInstituteId)
      ) {
        setSetupNavGate({
          ...emptySetupNavGate(),
          status: "unknown",
          coreComplete: true,
        });
      }
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setState({ ...emptyLoading(), status: "needs_institute" });
      setSetupNavGate(buildSetupNavGate(null));
      return;
    }

    const requestId = instituteCtx.activeInstituteId;
    const cached = peekSetupChecklistCache(requestId);
    if (cached) {
      setState(cached);
    } else if (readVerifiedSetupCoreComplete(requestId)) {
      setState((prev) =>
        prev.status === "ready" && activeIdRef.current === requestId
          ? prev
          : { ...emptyLoading(), coreComplete: true },
      );
    } else {
      setState((prev) =>
        prev.status === "ready" && activeIdRef.current === requestId
          ? prev
          : emptyLoading(),
      );
    }

    let cancelled = false;
    const shouldForce = dataRefreshGeneration !== refreshGenRef.current;
    refreshGenRef.current = dataRefreshGeneration;
    // Soft refresh generation bumps recount without allowing incomplete poison
    // to overwrite a verified-complete snapshot.
    void loadSetupChecklist(requestId, { force: shouldForce }).then((next) => {
      if (cancelled || activeIdRef.current !== requestId) return;
      setState((prev) => {
        if (shouldRetainPreviousComplete(prev, next, false)) {
          return prev;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    dataRefreshGeneration,
  ]);

  useEffect(() => {
    // While loading, keep the previous gate so we don't bounce users to /setup.
    if (state.status === "loading") return;
    setSetupNavGate(buildSetupNavGate(state));
  }, [state]);

  useEffect(() => {
    if (!apiMode || typeof window === "undefined") return;
    const onOnline = () => {
      // Soft recount — do not force-poison a verified-complete institute.
      void reload({ force: false });
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [apiMode, reload]);

  const value = useMemo(
    () => ({
      state,
      reload,
    }),
    [state, reload],
  );

  return createElement(
    SetupChecklistReactContext.Provider,
    { value },
    children,
  );
}

export function useSetupChecklist(): SetupChecklistContextValue {
  const ctx = useContext(SetupChecklistReactContext);
  if (!ctx) {
    throw new Error(
      "useSetupChecklist must be used within SetupChecklistProvider",
    );
  }
  return ctx;
}
