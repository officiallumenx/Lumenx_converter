import { useCallback, useEffect, useRef, useState } from "react";
import { sportsRepository } from "@/lib/activity/sports/repositories";
import type { SportsTeam, SportsTeamListFilters } from "@/lib/activity/sports/types";

const DEFAULT_FILTERS: SportsTeamListFilters = {
  status: "active",
  sportType: "all",
  gender: "all",
  ageCategory: "all",
  sortBy: "name",
  sortDir: "asc",
  query: "",
};

export function useSportsTeams(initialFilters?: Partial<SportsTeamListFilters>) {
  const [teams, setTeams] = useState<SportsTeam[]>([]);
  const [filters, setFilters] = useState<SportsTeamListFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  const loadedRef = useRef(false);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const updateFilters = useCallback((patch: Partial<SportsTeamListFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const my = ++seq.current;
    const showSpinner = !loadedRef.current;
    if (showSpinner) setIsLoading(true);

    sportsRepository
      .listTeams(filters)
      .then((list) => {
        if (seq.current !== my) return;
        setTeams(list);
        loadedRef.current = true;
        if (showSpinner) setIsLoading(false);
      })
      .catch(() => {
        if (seq.current !== my) return;
        if (showSpinner) setIsLoading(false);
      });
  }, [filters, tick]);

  return { teams, filters, isLoading, refresh, updateFilters, setFilters };
}
