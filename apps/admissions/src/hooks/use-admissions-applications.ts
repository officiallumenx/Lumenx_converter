import { useCallback, useEffect, useMemo, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { resolveAdmissionsInstituteId } from "@/lib/admissions/institute-context";
import {
  getApplicationById,
  getApplicationsForUser,
  getAllApplications,
} from "@/lib/admissions/repositories";
import { getApplicationsForInstitute } from "@/lib/admissions/institute-admin";
import {
  loadAdmissionsApplicationById,
  loadAdmissionsApplications,
  type AdmissionsApplicationsLoadState,
  type AdmissionsLoadStatus,
} from "@/lib/admissions/api";
import type { AdmissionApplication } from "@/lib/admissions/types";

type UseAdmissionsApplicationsOptions = {
  scope?: "parent" | "institute_admin";
};

export function useAdmissionsApplications(options: UseAdmissionsApplicationsOptions = {}) {
  const { user } = useAdmissionsAuth();
  const apiMode = isApiAuthMode();
  const instituteId = resolveAdmissionsInstituteId(user);
  const scope =
    options.scope ??
    (user?.accountType === "institute_admin" ? "institute_admin" : "parent");

  const [state, setState] = useState<AdmissionsApplicationsLoadState>({
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
    if (!user) {
      setState({ status: "empty", items: [], errorMessage: null });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, status: "loading", errorMessage: null }));

    void loadAdmissionsApplications(instituteId, {
      applicantId: scope === "parent" ? user.id : undefined,
      instituteAdmin: scope === "institute_admin",
    })
      .then((result) => {
        if (cancelled) return;
        setState(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            items: [],
            errorMessage: err instanceof Error ? err.message : "Failed to load applications",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteId, reloadKey, scope, user]);

  const demoApps = useMemo(() => {
    if (!user) return [];
    if (scope === "institute_admin" && user.instituteId) {
      return getApplicationsForInstitute(user.instituteId, getAllApplications());
    }
    return getApplicationsForUser(user.id);
  }, [scope, user, reloadKey]);

  const applications =
    apiMode && state.status !== "demo" ? state.items : demoApps;
  const loading = apiMode && state.status === "loading";
  const status: AdmissionsLoadStatus = apiMode ? state.status : "demo";

  return {
    applications,
    loading,
    status,
    errorMessage: state.errorMessage,
    reload,
    apiMode,
    instituteId,
  };
}

export function useAdmissionsApplication(applicationId: string | undefined) {
  const { user } = useAdmissionsAuth();
  const apiMode = isApiAuthMode();
  const [application, setApplication] = useState<AdmissionApplication | null | undefined>(
    undefined,
  );
  const [status, setStatus] = useState<AdmissionsLoadStatus>(apiMode ? "loading" : "demo");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) {
      setApplication(null);
      setStatus("empty");
      return;
    }

    if (!apiMode) {
      setApplication(getApplicationById(applicationId) ?? null);
      setStatus("demo");
      return;
    }
    if (!user) {
      setApplication(null);
      setStatus("empty");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    void loadAdmissionsApplicationById(applicationId, { applicantId: user.id })
      .then((result) => {
        if (cancelled) return;
        setApplication(result.application);
        setStatus(result.status);
        setErrorMessage(result.errorMessage);
      })
      .catch((err) => {
        if (cancelled) return;
        setApplication(null);
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load application");
      });

    return () => {
      cancelled = true;
    };
  }, [apiMode, applicationId, user]);

  return { application, status, errorMessage, apiMode };
}
