import { useCallback, useEffect, useMemo, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { resolveCareersInstituteId } from "@/lib/careers/institute-context";
import { getJobs, getJobById } from "@/lib/careers/repositories";
import {
  loadCareerJobById,
  loadCareerJobs,
  loadRecruiterCareerJobs,
  type CareersJobsLoadState,
  type CareersLoadStatus,
} from "@/lib/careers/api";
import type { JobPosting } from "@/lib/careers/types";

type UseCareersJobsOptions = {
  /** Recruiter workspace — include draft/closed listings */
  recruiterScope?: boolean;
  /** Only used in demo mode */
  openOnly?: boolean;
};

export function useCareersJobs(options: UseCareersJobsOptions = {}) {
  const { user } = useCareersAuth();
  const apiMode = isApiAuthMode();
  const instituteId = resolveCareersInstituteId(user);
  const instituteName = user?.organizationName ?? "Institute";
  const [state, setState] = useState<CareersJobsLoadState>({
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

    const loader = options.recruiterScope ? loadRecruiterCareerJobs : loadCareerJobs;
    void loader(instituteId, instituteName)
      .then((result) => {
        if (!cancelled) setState(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            items: [],
            errorMessage: err instanceof Error ? err.message : "Failed to load jobs",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteId, instituteName, options.recruiterScope, reloadKey]);

  const demoJobs = useMemo(() => {
    const rows = getJobs();
    if (options.openOnly === false) return rows;
    return rows.filter((job) => !job.recruiterJobStatus || job.recruiterJobStatus === "open");
  }, [options.openOnly, reloadKey]);

  const jobs = apiMode && state.status !== "demo" ? state.items : demoJobs;
  const loading = apiMode && state.status === "loading";
  const status: CareersLoadStatus = apiMode ? state.status : "demo";

  return {
    jobs,
    loading,
    status,
    errorMessage: state.errorMessage,
    reload,
    apiMode,
    instituteId,
  };
}

export function useCareersJob(jobId: string | undefined) {
  const { user } = useCareersAuth();
  const apiMode = isApiAuthMode();
  const instituteName = user?.organizationName ?? "Institute";
  const [job, setJob] = useState<JobPosting | null | undefined>(undefined);
  const [status, setStatus] = useState<CareersLoadStatus>(apiMode ? "loading" : "demo");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setStatus("empty");
      return;
    }

    if (!apiMode) {
      setJob(getJobById(jobId) ?? null);
      setStatus("demo");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    void loadCareerJobById(jobId, instituteName)
      .then((result) => {
        if (cancelled) return;
        setJob(result.job);
        setStatus(result.status);
        setErrorMessage(result.errorMessage);
      })
      .catch((err) => {
        if (cancelled) return;
        setJob(null);
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load job");
      });

    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteName, jobId]);

  return { job, status, errorMessage, apiMode };
}
