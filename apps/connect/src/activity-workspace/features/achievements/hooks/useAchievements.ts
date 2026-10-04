import { useCallback, useEffect, useRef, useState } from "react";
import { useReloadKey } from "@/hooks/useReloadKey";
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

type AchievementsCacheEntry = {
  cacheKey: string;
  list: ActivityAchievement[];
};

/** Survives remount so achievements list does not skeleton-flash on revisit. */
let achievementsCache: AchievementsCacheEntry | null = null;

function filtersCacheKey(
  filters: AchievementListFilters,
  locked?: AchievementSourceModule,
): string {
  const effective = locked ? { ...filters, sourceModule: locked } : filters;
  return JSON.stringify(effective);
}

export function useAchievements(options?: UseAchievementsOptions) {
  const lockedSourceModule = options?.lockedSourceModule;

  const [filters, setFilters] = useState<AchievementListFilters>({
    ...DEFAULT_FILTERS,
    ...options?.initialFilters,
    ...(lockedSourceModule ? { sourceModule: lockedSourceModule } : {}),
  });

  const initialKey = filtersCacheKey(
    {
      ...DEFAULT_FILTERS,
      ...options?.initialFilters,
      ...(lockedSourceModule ? { sourceModule: lockedSourceModule } : {}),
    },
    lockedSourceModule,
  );
  const cached =
    achievementsCache?.cacheKey === initialKey ? achievementsCache.list : null;

  const [achievements, setAchievements] = useState<ActivityAchievement[]>(
    () => cached ?? [],
  );
  const [studentOptions, setStudentOptions] = useState<{ id: string; label: string }[]>([]);
  const [teamOptions, setTeamOptions] = useState<{ id: string; name: string }[]>([]);
  const [sourceOptions, setSourceOptions] = useState<
    ReturnType<typeof achievementsRepository.listEligibleSourceOptions>
  >([]);
  const [isLoading, setIsLoading] = useState(() => !cached);
  const [tick, setTick] = useReloadKey();
  const seq = useRef(0);
  const loadedRef = useRef(Boolean(cached));

  const refresh = useCallback(() => setTick((t) => t + 1), [setTick]);

  const updateFilters = useCallback(
    (patch: Partial<AchievementListFilters>) => {
      setFilters((prev) => ({
        ...prev,
        ...patch,
        ...(lockedSourceModule ? { sourceModule: lockedSourceModule } : {}),
      }));
      setTick((t) => t + 1);
    },
    [lockedSourceModule, setTick],
  );

  useEffect(() => {
    setStudentOptions(achievementsRepository.listStudentFilterOptions());
    setTeamOptions(achievementsRepository.listTeamFilterOptions());
    const module = lockedSourceModule ?? "sports";
    setSourceOptions(achievementsRepository.listEligibleSourceOptions(module));
  }, [tick, lockedSourceModule]);

  useEffect(() => {
    const my = ++seq.current;
    const effectiveFilters: AchievementListFilters = lockedSourceModule
      ? { ...filters, sourceModule: lockedSourceModule }
      : filters;
    const key = filtersCacheKey(effectiveFilters, lockedSourceModule);
    const hit = achievementsCache?.cacheKey === key ? achievementsCache.list : null;

    if (hit) {
      setAchievements(hit);
      loadedRef.current = true;
      setIsLoading(false);
    }

    const showSpinner = !loadedRef.current && !hit;
    if (showSpinner) setIsLoading(true);

    achievementsRepository
      .listAchievements(effectiveFilters)
      .then((list) => {
        if (seq.current !== my) return;
        achievementsCache = { cacheKey: key, list };
        setAchievements(list);
        loadedRef.current = true;
        setIsLoading(false);
      })
      .catch(() => {
        if (seq.current !== my) return;
        setIsLoading(false);
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
