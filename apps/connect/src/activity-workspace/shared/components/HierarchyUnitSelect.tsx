import { ActivityEmptyState } from "@/activity-workspace/shared/ui/ActivityEmptyState";
import { ActivityFilterBar } from "@/activity-workspace/shared/ui/ActivityFilterBar";
import { PageSkeleton } from "@/activity-workspace/shared/ui/PageSkeleton";
import {
  formatUnitLabel,
  unitKindLabel,
  type HierarchyUnit,
} from "@/lib/activity/hierarchy";

/** Multi-select chips for hierarchy Units (Teams or Groups). */
export function HierarchyUnitMultiSelect({
  units,
  selectedIds,
  onChange,
  loading,
  hideLabel,
}: {
  units: HierarchyUnit[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  hideLabel?: boolean;
}) {
  const unitLabel = units[0] ? unitKindLabel(units[0].kind) : "unit";

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  if (loading) {
    return <PageSkeleton variant="list" rows={2} className="py-1" />;
  }

  if (units.length === 0) {
    return (
      <ActivityEmptyState
        compact
        title={`No ${unitLabel.toLowerCase()}s yet`}
        description="Create them under Sports or Extra-Curricular first, then come back here."
      />
    );
  }

  return (
    <div>
      {hideLabel ? null : (
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Select {unitLabel.toLowerCase()}(s)
        </label>
      )}
      <ActivityFilterBar>
        {units.map((unit) => {
          const active = selectedIds.includes(unit.id);
          return (
            <button
              key={unit.id}
              type="button"
              onClick={() => toggle(unit.id)}
              aria-pressed={active}
              className={active ? "activity-filter-chip is-active" : "activity-filter-chip"}
            >
              {formatUnitLabel(unit)}
              <span className="ml-1 opacity-70">({unit.students.length})</span>
            </button>
          );
        })}
      </ActivityFilterBar>
    </div>
  );
}

/** Single-select for one Unit — tapping another replaces the selection. */
export function HierarchyUnitSingleSelect({
  units,
  selectedId,
  onChange,
  loading,
  hideLabel,
}: {
  units: HierarchyUnit[];
  selectedId: string;
  onChange: (id: string) => void;
  loading?: boolean;
  hideLabel?: boolean;
}) {
  const unitLabel = units[0] ? unitKindLabel(units[0].kind) : "unit";

  if (loading) {
    return <PageSkeleton variant="list" rows={2} className="py-1" />;
  }

  if (units.length === 0) {
    return (
      <ActivityEmptyState
        compact
        title={`No ${unitLabel.toLowerCase()}s yet`}
        description="Create them under Sports or Extra-Curricular first, then come back here."
      />
    );
  }

  return (
    <div>
      {hideLabel ? null : (
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Select {unitLabel.toLowerCase()}
        </label>
      )}
      <ActivityFilterBar>
        {units.map((unit) => {
          const active = selectedId === unit.id;
          return (
            <button
              key={unit.id}
              type="button"
              onClick={() => onChange(unit.id)}
              aria-pressed={active}
              className={active ? "activity-filter-chip is-active" : "activity-filter-chip"}
            >
              {formatUnitLabel(unit)}
              <span className="ml-1 opacity-70">({unit.students.length})</span>
            </button>
          );
        })}
      </ActivityFilterBar>
    </div>
  );
}
