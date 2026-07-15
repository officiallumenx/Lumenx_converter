import { useCallback, useEffect, useRef, useState } from "react";
import { achievementsRepository } from "@/lib/activity/achievements/repositories";
import type {
  AchievementListFilters,
  AchievementSourceModule,
  ActivityAchievement,
} from "@/lib/activity/achievements/types";

const DEFAULT_FILTERS: AchievementListFilters = {
  achievementType: "all",
  level: "all",
  studentId: "all",
  teamId: "all",
  sourceModule: "all",
  date: "all",
  sortBy: "date",
  sortDir: "desc",
  query: "",
};

type UseAchievementsOptions = {
  initialFilters?: Partial<AchievementListFilters>;
  lockedSourceModule?: AchievementSourceModule;
};

export function useAchievements(options?: UseAchievementsOptions) {
  const lockedSourceModule = options?.lockedSourceModule;

  const [achievements, setAchievements] = useState<ActivityAchievement[]>([]);
  const [studentOptions, setStudentOptions] = useState<{ id: string; label: string }[]>([]);
  const [teamOptions, setTeamOptions] = useState<{ id: string; name: string }[]>([]);
  const [sourceOptions, setSourceOptions] = useState<
    ReturnType<typeof achievementsRepository.listEligibleSourceOptions>
  >([]);
  const [filters, setFilters] = useState<AchievementListFilters>({
    ...DEFAULT_FILTERS,
    ...options?.initialFilters,
    ...(lockedSourceModule ? { sourceModule: lockedSourceModule } : {}),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  const loadedRef = useRef(false);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const updateFilters = useCallback(
    (patch: Partial<AchievementListFilters>) => {
      setFilters((prev) => ({
        ...prev,
        ...patch,
        ...(lockedSourceModule ? { sourceModule: lockedSourceModule } : {}),
      }));
      setTick((t) => t + 1);
    },
    [lockedSourceModule],
  );

  useEffect(() => {
    setStudentOptions(achievementsRepository.listStudentFilterOptions());
    setTeamOptions(achievementsRepository.listTeamFilterOptions());
    const module = lockedSourceModule ?? "sports";
    setSourceOptions(achievementsRepository.listEligibleSourceOptions(module));
  }, [tick, lockedSourceModule]);

  useEffect(() => {
    const my = ++seq.current;
    const showSpinner = !loadedRef.current;
    if (showSpinner) setIsLoading(true);

    const effectiveFilters: AchievementListFilters = lockedSourceModule
      ? { ...filters, sourceModule: lockedSourceModule }
      : filters;

    achievementsRepository
      .listAchievements(effectiveFilters)
      .then((list) => {
        if (seq.current !== my) return;
        setAchievements(list);
        loadedRef.current = true;
        if (showSpinner) setIsLoading(false);
      })
      .catch(() => {
        if (seq.current !== my) return;
        if (showSpinner) setIsLoading(false);
      });
  }, [filters, tick, lockedSourceModule]);

  return {
    achievements,
    studentOptions,
    teamOptions,
    sourceOptions,
    filters,
    isLoading,
    refresh,
    updateFilters,
    lockedSourceModule,
  };
}
