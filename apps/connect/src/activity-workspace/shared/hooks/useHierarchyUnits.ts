import { useActivityCachedLoad } from "@/activity-workspace/shared/hooks/useActivityCachedLoad";
import {
  activityHierarchyRepository,
  type ActivityDomain,
  type HierarchyUnit,
} from "@/lib/activity/hierarchy";

/** Load reusable Units (Teams / Groups) for a domain. */
export function useHierarchyUnits(domain: ActivityDomain) {
  const { data: units, loading } = useActivityCachedLoad({
    key: `hierarchy:units:${domain}`,
    load: () => activityHierarchyRepository.listUnits(domain),
    initial: [] as HierarchyUnit[],
  });

  return { units, loading };
}
