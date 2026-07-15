import { useCallback, useEffect, useRef, useState } from "react";
import { sportsRepository } from "@/lib/activity/sports/repositories";
import type { SportsProgramSection } from "@/lib/activity/sports/sections-types";

export function useSportsProgramSections() {
  const [sections, setSections] = useState<SportsProgramSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  const loadedRef = useRef(false);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const my = ++seq.current;
    const showSpinner = !loadedRef.current;
    if (showSpinner) setIsLoading(true);

    sportsRepository
      .listSections()
      .then((list) => {
        if (seq.current !== my) return;
        setSections(list);
        loadedRef.current = true;
        if (showSpinner) setIsLoading(false);
      })
      .catch(() => {
        if (seq.current !== my) return;
        if (showSpinner) setIsLoading(false);
      });
  }, [tick]);

  return { sections, isLoading, refresh };
}
