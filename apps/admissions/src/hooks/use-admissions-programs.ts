import { useCallback, useEffect, useMemo, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { resolveAdmissionsInstituteId } from "@/lib/admissions/institute-context";
import { getPrograms } from "@/lib/admissions/repositories";
import {
  loadAdmissionsPrograms,
  type AdmissionsLoadStatus,
  type AdmissionsProgramsLoadState,
} from "@/lib/admissions/api";
import type { AdmissionProgram } from "@/lib/admissions/types";

type UseAdmissionsProgramsOptions = {
  instituteId?: string | null;
};

export function useAdmissionsPrograms(options: UseAdmissionsProgramsOptions = {}) {
  const { user } = useAdmissionsAuth();
  const apiMode = isApiAuthMode();
  const instituteId = options.instituteId ?? resolveAdmissionsInstituteId(user);

  const [state, setState] = useState<AdmissionsProgramsLoadState>({
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

    let cancelled = false;
    setState((prev) => ({ ...prev, status: "loading", errorMessage: null }));

    void loadAdmissionsPrograms(instituteId)
      .then((result) => {
        if (!cancelled) setState(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            items: [],
            errorMessage: err instanceof Error ? err.message : "Failed to load programs",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteId, reloadKey]);

  const demoPrograms = useMemo((): AdmissionProgram[] => {
    void reloadKey;
    return instituteId ? getPrograms(instituteId) : getPrograms();
  }, [instituteId, reloadKey]);

  const programs = apiMode && state.status !== "demo" ? state.items : demoPrograms;
  const loading = apiMode && state.status === "loading";
  const status: AdmissionsLoadStatus = apiMode ? state.status : "demo";

  return {
    programs,
    loading,
    status,
    errorMessage: state.errorMessage,
    reload,
    apiMode,
    instituteId,
  };
}
