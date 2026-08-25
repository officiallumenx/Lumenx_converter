import { useAsyncLoad } from "@/lib/hooks/useAsyncLoad";
import {
  activityHierarchyRepository,
  type ActivityDomain,
  type HierarchyUnit,
} from "@/lib/activity/hierarchy";

/** Load reusable Units (Teams / Groups) for a domain. */
export function useHierarchyUnits(domain: ActivityDomain) {
  const { data: units, loading } = useAsyncLoad(
    () => activityHierarchyRepository.listUnits(domain),
    [domain],
    { initial: [] as HierarchyUnit[], fallbackOnError: [] },
  );

  return { units, loading };
}
