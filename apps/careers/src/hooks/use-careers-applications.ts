import { useCallback, useEffect, useMemo, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { resolveCareersInstituteId } from "@/lib/careers/institute-context";
import {
  getApplicationById,
  getApplicationsForOrganization,
  getApplicationsForUser,
} from "@/lib/careers/repositories";
import {
  loadCareerApplicationById,
  loadCareerApplications,
  type CareersApplicationsLoadState,
  type CareersLoadStatus,
} from "@/lib/careers/api";
import type { JobApplication } from "@/lib/careers/types";
import { isRecruiter } from "@/lib/careers/auth-utils";

type UseCareersApplicationsOptions = {
  scope?: "candidate" | "recruiter";
};

export function useCareersApplications(options: UseCareersApplicationsOptions = {}) {
  const { user } = useCareersAuth();
  const apiMode = isApiAuthMode();
  const instituteId = resolveCareersInstituteId(user);
  const instituteName = user?.organizationName ?? "Institute";
  const scope =
    options.scope ?? (user && isRecruiter(user) ? "recruiter" : "candidate");

  const [state, setState] = useState<CareersApplicationsLoadState>({
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

    void loadCareerApplications(instituteId, {
      candidateId: scope === "candidate" ? user.id : undefined,
      instituteName,
    })
      .then((result) => {
        if (cancelled) return;
        const items =
          scope === "candidate"
            ? result.items.filter((app) => app.candidateId === user.id)
            : result.items;
        setState({
          ...result,
          items,
          status: items.length === 0 && result.status === "ready" ? "empty" : result.status,
        });
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
  }, [apiMode, instituteId, instituteName, reloadKey, scope, user]);

  const demoApps = useMemo(() => {
    if (!user) return [];
    if (scope === "recruiter" && user.organizationId) {
      return getApplicationsForOrganization(user.organizationId);
    }
    return getApplicationsForUser(user.id);
  }, [scope, user, reloadKey]);

  const applications = apiMode && state.status !== "demo" ? state.items : demoApps;
  const loading = apiMode && state.status === "loading";
  const status: CareersLoadStatus = apiMode ? state.status : "demo";

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

export function useCareersApplication(applicationId: string | undefined) {
  const { user } = useCareersAuth();
  const apiMode = isApiAuthMode();
  const instituteName = user?.organizationName ?? "Institute";
  const [application, setApplication] = useState<JobApplication | null | undefined>(
    undefined,
  );
  const [status, setStatus] = useState<CareersLoadStatus>(apiMode ? "loading" : "demo");
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
    void loadCareerApplicationById(applicationId, {
      candidateId: user.id,
      instituteName,
    })
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
  }, [apiMode, applicationId, instituteName, user]);

  return { application, status, errorMessage, apiMode };
}
