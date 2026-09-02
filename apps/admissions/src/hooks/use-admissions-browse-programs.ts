import { useCallback, useEffect, useMemo, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { listAllInstitutes } from "@/lib/institutes-data";
import { getProgramsGroupedByInstitute } from "@/lib/programs-data";
import {
  loadAdmissionsBrowsePrograms,
  type AdmissionsLoadStatus,
} from "@/lib/admissions/api";
import type { AdmissionProgram } from "@/lib/admissions/types";
import { isInstituteUuid } from "@/lib/institute-id";

export type BrowseProgramsGroup = {
  instituteId: string;
  instituteName: string;
  programs: AdmissionProgram[];
};

export function useAdmissionsBrowsePrograms() {
  const apiMode = isApiAuthMode();

  const instituteIds = useMemo(
    () => listAllInstitutes().filter((i) => isInstituteUuid(i.id)).map((i) => i.id),
    [],
  );

  const [state, setState] = useState<{
    status: AdmissionsLoadStatus;
    grouped: { instituteId: string; programs: AdmissionProgram[] }[];
    errorMessage: string | null;
  }>({
    status: apiMode ? "loading" : "demo",
    grouped: [],
    errorMessage: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!apiMode) {
      setState({ status: "demo", grouped: [], errorMessage: null });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, status: "loading", errorMessage: null }));

    void loadAdmissionsBrowsePrograms(instituteIds)
      .then((result) => {
        if (!cancelled) setState(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            grouped: [],
            errorMessage: err instanceof Error ? err.message : "Failed to load programs",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteIds, reloadKey]);

  const demoGrouped = useMemo((): BrowseProgramsGroup[] => {
    void reloadKey;
    return getProgramsGroupedByInstitute();
  }, [reloadKey]);

  const apiGrouped: BrowseProgramsGroup[] = useMemo(() => {
    return state.grouped.map((group) => ({
      instituteId: group.instituteId,
      instituteName:
        listAllInstitutes().find((i) => i.id === group.instituteId)?.name ??
        group.instituteId,
      programs: group.programs,
    }));
  }, [state.grouped]);

  const grouped = apiMode && state.status !== "demo" ? apiGrouped : demoGrouped;
  const loading = apiMode && state.status === "loading";
  const status: AdmissionsLoadStatus = apiMode ? state.status : "demo";

  return {
    grouped,
    loading,
    status,
    errorMessage: state.errorMessage,
    reload,
    apiMode,
  };
}
