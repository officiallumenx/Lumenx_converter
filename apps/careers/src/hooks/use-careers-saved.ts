import { useCallback, useEffect, useMemo, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { resolveCareersInstituteId } from "@/lib/careers/institute-context";
import {
  getSavedJobIds,
  getSavedJobs,
  isJobSaved as isJobSavedDemo,
  toggleSavedJob as toggleSavedJobDemo,
} from "@/lib/careers/saved-store";
import { getJobById } from "@/lib/careers/repositories";
import {
  createSavedItem,
  deleteSavedItem,
  listSavedItems,
  loadCareerJobById,
  type UserSavedItemDto,
} from "@/lib/careers/api";
import type { JobPosting } from "@/lib/careers/types";

export function useCareersSaved() {
  const { user } = useCareersAuth();
  const apiMode = isApiAuthMode();
  const instituteId = resolveCareersInstituteId(user);
  const [items, setItems] = useState<UserSavedItemDto[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(apiMode);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setJobs([]);
      setLoading(false);
      return;
    }

    if (!apiMode) {
      setJobs(getSavedJobs(user.id));
      setLoading(false);
      return;
    }

    if (!instituteId) {
      setItems([]);
      setJobs([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void listSavedItems(instituteId)
      .then(async (rows) => {
        if (cancelled) return;
        setItems(rows);
        const resolved = await Promise.all(
          rows.map(async (row) => {
            const cached = getJobById(row.itemId);
            if (cached) return cached;
            const result = await loadCareerJobById(row.itemId);
            return result.job;
          }),
        );
        if (!cancelled) {
          setJobs(resolved.filter((job): job is JobPosting => job != null));
          setErrorMessage(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setItems([]);
          setJobs([]);
          setErrorMessage(err instanceof Error ? err.message : "Failed to load saved jobs");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteId, reloadKey, user]);

  const savedJobIds = useMemo(() => {
    if (apiMode) return items.map((item) => item.itemId);
    return user ? getSavedJobIds(user.id) : [];
  }, [apiMode, items, user]);

  const isSaved = useCallback(
    (jobId: string) => {
      if (!user) return false;
      if (apiMode) return savedJobIds.includes(jobId);
      return isJobSavedDemo(user.id, jobId);
    },
    [apiMode, savedJobIds, user],
  );

  const toggleSaved = useCallback(
    async (jobId: string): Promise<boolean> => {
      if (!user) return false;

      if (apiMode && instituteId) {
        const existing = items.find((item) => item.itemId === jobId);
        if (existing) {
          await deleteSavedItem(existing.id);
          setItems((prev) => prev.filter((item) => item.id !== existing.id));
          setJobs((prev) => prev.filter((job) => job.id !== jobId));
          return false;
        }
        const created = (await createSavedItem({
          instituteId,
          itemKind: "career_job",
          itemId: jobId,
        })) as UserSavedItemDto;
        setItems((prev) => [...prev, created]);
        const job = getJobById(jobId) ?? (await loadCareerJobById(jobId)).job;
        if (job) setJobs((prev) => [...prev, job]);
        return true;
      }

      return toggleSavedJobDemo(user.id, jobId);
    },
    [apiMode, instituteId, items, user],
  );

  return {
    savedJobs: apiMode ? jobs : user ? getSavedJobs(user.id) : [],
    loading,
    errorMessage,
    isSaved,
    toggleSaved,
    reload,
    apiMode,
  };
}
