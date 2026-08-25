import type { HierarchyStudent } from "@/lib/activity/hierarchy";
import { ActivityEmptyState } from "@/activity-workspace/shared/ui/ActivityEmptyState";
import { Users } from "lucide-react";

/**
 * Multi-select students from a hierarchy Unit roster only.
 * Do not pass institute-wide lists — students come from Team/Group.
 */
export function HierarchyUnitStudentMultiSelect({
  students,
  selectedIds,
  onChange,
  emptyLabel = "No students on this unit. Add them in Sports or ECA first.",
}: {
  students: HierarchyStudent[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyLabel?: string;
}) {
  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  if (students.length === 0) {
    return (
      <ActivityEmptyState
        compact
        icon={Users}
        title="No students on this roster"
        description={emptyLabel}
      />
    );
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        Select student(s)
      </label>
      <ul className="space-y-2">
        {students.map((s) => {
          const active = selectedIds.includes(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => toggle(s.id)}
                aria-pressed={active}
                className={
                  active
                    ? "flex min-h-12 w-full items-center justify-between rounded-xl border border-primary/40 bg-primary/5 px-3 py-2.5 text-left text-sm"
                    : "flex min-h-12 w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left text-sm hover:border-primary/30"
                }
              >
                <span className="min-w-0">
                  <span className="font-medium">{s.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground sm:mt-0 sm:ml-2 sm:inline">
                    {s.classLabel} · Roll {s.rollNo}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                  {active ? "Selected" : "Tap"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
