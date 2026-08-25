import { memo, useMemo } from "react";
import { AlertTriangle, CalendarDays, ChevronRight, LayoutGrid } from "lucide-react";
import { Pill } from "@lumenx/ui-admin";
import { IconChip } from "@/components/IconChip";
import {
  classKey,
  countEmptySlots,
  countTeachingSlotsPerWeek,
  getRecordSchedule,
  type TimetableRecord,
} from "@/lib/timetable-data";
import {
  readinessLabel,
  readinessTone,
  type TimetableReadiness,
} from "@/lib/timetable-manager";

function filledCount(grid: TimetableRecord["grid"], schedule: ReturnType<typeof getRecordSchedule>) {
  return countTeachingSlotsPerWeek(schedule) - countEmptySlots(grid, schedule);
}

function sortTimetables(timetables: TimetableRecord[]) {
  return [...timetables].sort((a, b) => {
    const ga = Number.parseInt(a.grade.replace(/\D/g, ""), 10);
    const gb = Number.parseInt(b.grade.replace(/\D/g, ""), 10);
    return gb - ga || a.section.localeCompare(b.section);
  });
}

const TimetableCard = memo(function TimetableCard({
  timetable,
  conflicts,
  readiness,
  onOpen,
}: {
  timetable: TimetableRecord;
  conflicts: number;
  readiness: TimetableReadiness;
  onOpen: (id: string) => void;
}) {
  const schedule = getRecordSchedule(timetable);
  const total = countTeachingSlotsPerWeek(schedule);
  const filled = filledCount(timetable.grid, schedule);
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const label = classKey(timetable.grade, timetable.section);

  return (
    <button
      type="button"
      onClick={() => onOpen(timetable.id)}
      className="lx-timetable-card group text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <IconChip icon={CalendarDays} size="md" />
          <div className="min-w-0">
            <div className="font-semibold text-base truncate">{label}</div>
            <div className="text-[11px] text-muted-foreground truncate">{timetable.term}</div>
          </div>
        </div>
        <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Pill tone={readinessTone(readiness)}>{readinessLabel(readiness)}</Pill>
        {conflicts > 0 && (
          <Pill tone="danger">
            <AlertTriangle className="size-3" />
            {conflicts} conflict{conflicts !== 1 ? "s" : ""}
          </Pill>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <LayoutGrid className="size-3.5" />
            Periods filled
          </span>
          <span className="font-medium font-mono">
            {filled}/{total} ({pct}%)
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-success" : pct > 0 ? "bg-primary" : "bg-muted-foreground/30"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-3 text-[10px] text-muted-foreground">Updated {timetable.updatedAt}</div>
    </button>
  );
});

export function TimetableCards({
  timetables,
  conflictCounts,
  readinessById,
  onOpen,
}: {
  timetables: TimetableRecord[];
  conflictCounts: Record<string, number>;
  readinessById: Record<string, TimetableReadiness>;
  onOpen: (id: string) => void;
}) {
  const sorted = useMemo(() => sortTimetables(timetables), [timetables]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {sorted.map((timetable) => (
        <TimetableCard
          key={timetable.id}
          timetable={timetable}
          conflicts={conflictCounts[timetable.id] ?? 0}
          readiness={readinessById[timetable.id] ?? "incomplete"}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
