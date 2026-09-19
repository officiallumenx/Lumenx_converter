/**
 * Shared setup checklist state for /setup, home banner, and nav gating.
 * Soft-refreshes so returning to the checklist does not flash a full reload.
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
import { buildSetupNavGate } from "./gate";
import {
  invalidateSetupChecklistCache,
  loadSetupChecklist,
  peekSetupChecklistCache,
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
      return (
        peekSetupChecklistCache(instituteCtx.activeInstituteId) ?? emptyLoading()
      );
    }
    return emptyLoading();
  });
  const activeIdRef = useRef(instituteCtx.activeInstituteId);
  activeIdRef.current = instituteCtx.activeInstituteId;
  const refreshGenRef = useRef(dataRefreshGeneration);

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
      }
      const next = await loadSetupChecklist(instituteId, opts);
      if (activeIdRef.current !== instituteId) return;
      setState(next);
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
        prev.status === "ready" ? prev : emptyLoading(),
      );
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
    // Keep last ready UI when we already have cache (no loading flash on return).
    if (cached) {
      setState(cached);
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
    void loadSetupChecklist(requestId, { force: shouldForce }).then((next) => {
      if (cancelled || activeIdRef.current !== requestId) return;
      setState(next);
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
    setSetupNavGate(buildSetupNavGate(state.status === "loading" ? null : state));
  }, [state]);

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
