import { useCallback, useEffect, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getProgramByIdV2 } from "@/lib/programs-data";
import {
  loadAdmissionsProgramById,
  type AdmissionsLoadStatus,
} from "@/lib/admissions/api";
import type { AdmissionProgram } from "@/lib/admissions/types";
import { isInstituteUuid } from "@/lib/institute-id";

export function useAdmissionProgramDetail(programId: string) {
  const apiMode = isApiAuthMode();
  const canUseApi = apiMode && isInstituteUuid(programId);

  const [state, setState] = useState<{
    status: AdmissionsLoadStatus;
    program: AdmissionProgram | null;
    errorMessage: string | null;
  }>({
    status: canUseApi ? "loading" : "demo",
    program: null,
    errorMessage: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!canUseApi) {
      setState({ status: "demo", program: null, errorMessage: null });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, status: "loading", errorMessage: null }));

    void loadAdmissionsProgramById(programId)
      .then((result) => {
        if (!cancelled) setState(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            program: null,
            errorMessage: err instanceof Error ? err.message : "Failed to load program",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canUseApi, programId, reloadKey]);

  const demoProgram = !canUseApi ? getProgramByIdV2(programId) : null;
  const program = canUseApi && state.status !== "demo" ? state.program : demoProgram;
  const loading = canUseApi && state.status === "loading";

  return {
    program,
    loading,
    status: canUseApi ? state.status : "demo",
    errorMessage: state.errorMessage,
    reload,
    apiMode: canUseApi,
  };
}
