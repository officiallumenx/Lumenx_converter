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

function filledCount(grid: TimetableRecord["grid"], schedule: ReturnType<typeof getRecordSchedule>) {
  return countTeachingSlotsPerWeek(schedule) - countEmptySlots(grid, schedule);
}

export function TimetableCards({
  timetables,
  conflictCounts,
  onOpen,
}: {
  timetables: TimetableRecord[];
  conflictCounts: Record<string, number>;
  onOpen: (id: string) => void;
}) {
  const sorted = [...timetables].sort((a, b) => {
    const ga = Number.parseInt(a.grade.replace(/\D/g, ""), 10);
    const gb = Number.parseInt(b.grade.replace(/\D/g, ""), 10);
    return gb - ga || a.section.localeCompare(b.section);
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {sorted.map((tt) => {
        const schedule = getRecordSchedule(tt);
        const total = countTeachingSlotsPerWeek(schedule);
        const filled = filledCount(tt.grid, schedule);
        const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
        const conflicts = conflictCounts[tt.id] ?? 0;
        const label = classKey(tt.grade, tt.section);

        return (
          <button
            key={tt.id}
            type="button"
            onClick={() => onOpen(tt.id)}
            className="lx-timetable-card group text-left"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <IconChip icon={CalendarDays} size="md" />
                <div className="min-w-0">
                  <div className="font-semibold text-base truncate">{label}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{tt.term}</div>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Pill tone={tt.status === "published" ? "success" : "warning"}>
                {tt.status === "published" ? "Published" : "Draft"}
              </Pill>
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

            <div className="mt-3 text-[10px] text-muted-foreground">Updated {tt.updatedAt}</div>
          </button>
        );
      })}
    </div>
  );
}
