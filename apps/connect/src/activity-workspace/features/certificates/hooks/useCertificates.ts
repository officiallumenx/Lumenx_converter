import { useCallback, useEffect, useRef, useState } from "react";
import { certificatesRepository } from "@/lib/activity/certificates/repositories";
import type {
  ActivityCertificate,
  CertificateListFilters,
  CertificateTemplate,
} from "@/lib/activity/certificates/types";

const DEFAULT_FILTERS: CertificateListFilters = {
  templateId: "all",
  category: "all",
  studentId: "all",
  teamId: "all",
  status: "all",
  date: "all",
  sortBy: "date",
  sortDir: "desc",
  query: "",
};

export function useCertificates(initialFilters?: Partial<CertificateListFilters>) {
  const [certificates, setCertificates] = useState<ActivityCertificate[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [studentOptions, setStudentOptions] = useState<{ id: string; label: string }[]>([]);
  const [teamOptions, setTeamOptions] = useState<{ id: string; name: string }[]>([]);
  const [achievementOptions, setAchievementOptions] = useState<
    ReturnType<typeof certificatesRepository.listEligibleAchievementOptions>
  >([]);
  const [filters, setFilters] = useState<CertificateListFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  const loadedRef = useRef(false);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const updateFilters = useCallback((patch: Partial<CertificateListFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    setTemplates(certificatesRepository.listCertificateTemplates());
    setStudentOptions(certificatesRepository.listStudentFilterOptions());
    setTeamOptions(certificatesRepository.listTeamFilterOptions());
    setAchievementOptions(certificatesRepository.listEligibleAchievementOptions());
  }, [tick]);

  useEffect(() => {
    const my = ++seq.current;
    const showSpinner = !loadedRef.current;
    if (showSpinner) setIsLoading(true);

    certificatesRepository
      .listCertificates(filters)
      .then((list) => {
        if (seq.current !== my) return;
        setCertificates(list);
        loadedRef.current = true;
        if (showSpinner) setIsLoading(false);
      })
      .catch(() => {
        if (seq.current !== my) return;
        if (showSpinner) setIsLoading(false);
      });
  }, [filters, tick]);

  return {
    certificates,
    templates,
    studentOptions,
    teamOptions,
    achievementOptions,
    filters,
    isLoading,
    refresh,
    updateFilters,
  };
}
