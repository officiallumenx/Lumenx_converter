import { useCallback, useEffect, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { resolveCareersInstituteId } from "@/lib/careers/institute-context";
import {
  getCandidateProfile,
  saveCandidateProfile,
  type CandidateProfile,
} from "@/lib/careers/profile-repository";
import {
  candidateProfileDtoToProfile,
  candidateProfileToUpsertInput,
} from "@/lib/careers/api/profile-map";
import { getMyCandidateProfile, upsertCandidateProfile } from "@/lib/careers/api";

export function useCareersProfile() {
  const { user } = useCareersAuth();
  const apiMode = isApiAuthMode();
  const instituteId = resolveCareersInstituteId(user);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(apiMode);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    if (!apiMode) {
      setProfile(getCandidateProfile(user.id));
      setLoading(false);
      return;
    }

    if (!instituteId) {
      setProfile(getCandidateProfile(user.id));
      setLoading(false);
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void getMyCandidateProfile(instituteId)
      .then((dto) => {
        if (cancelled) return;
        if (dto) {
          setProfile(candidateProfileDtoToProfile(dto, user.id));
        } else {
          setProfile(getCandidateProfile(user.id));
        }
        setErrorMessage(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setProfile(getCandidateProfile(user.id));
        setErrorMessage(err instanceof Error ? err.message : "Failed to load profile");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteId, reloadKey, user]);

  const save = useCallback(
    async (next: CandidateProfile): Promise<CandidateProfile> => {
      if (!user) throw new Error("Sign in required");

      if (apiMode && instituteId) {
        const input = candidateProfileToUpsertInput(next, instituteId, user);
        const dto = await upsertCandidateProfile(input);
        const saved = candidateProfileDtoToProfile(dto, user.id);
        setProfile(saved);
        return saved;
      }

      const saved = saveCandidateProfile(next);
      setProfile(saved);
      return saved;
    },
    [apiMode, instituteId, user],
  );

  return {
    profile,
    loading,
    errorMessage,
    save,
    reload,
    apiMode,
    setProfile,
  };
}
