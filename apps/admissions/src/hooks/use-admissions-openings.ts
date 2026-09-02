import { useCallback, useEffect, useMemo, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { resolveAdmissionsInstituteId } from "@/lib/admissions/institute-context";
import { getOpeningsForInstitute } from "@/lib/admissions/openings-store";
import {
  loadAdmissionsOpenings,
  type AdmissionsLoadStatus,
  type AdmissionsOpeningsLoadState,
} from "@/lib/admissions/api";
import type { AdmissionOpening } from "@/lib/admissions/types";

type UseAdmissionsOpeningsOptions = {
  instituteId?: string | null;
};

export function useAdmissionsOpenings(options: UseAdmissionsOpeningsOptions = {}) {
  const { user } = useAdmissionsAuth();
  const apiMode = isApiAuthMode();
  const instituteId = options.instituteId ?? resolveAdmissionsInstituteId(user);

  const [state, setState] = useState<AdmissionsOpeningsLoadState>({
    status: apiMode ? "loading" : "demo",
    items: [],
    errorMessage: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!apiMode) {
      setState({ status: "demo", items: [], errorMessage: null });
      return;
    }
    if (!instituteId) {
      setState({ status: "needs_institute", items: [], errorMessage: null });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, status: "loading", errorMessage: null }));

    void loadAdmissionsOpenings(instituteId)
      .then((result) => {
        if (!cancelled) setState(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            items: [],
            errorMessage: err instanceof Error ? err.message : "Failed to load openings",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteId, reloadKey]);

  const demoOpenings = useMemo((): AdmissionOpening[] => {
    void reloadKey;
    return instituteId ? getOpeningsForInstitute(instituteId) : [];
  }, [instituteId, reloadKey]);

  const openings = apiMode && state.status !== "demo" ? state.items : demoOpenings;
  const loading = apiMode && state.status === "loading";
  const status: AdmissionsLoadStatus = apiMode ? state.status : "demo";

  return {
    openings,
    loading,
    status,
    errorMessage: state.errorMessage,
    reload,
    apiMode,
    instituteId,
  };
}
