import { useMemo } from "react";
import { Button, Card, CardBody, CardHeader } from "@lumenx/ui-admin";
import {
  buildScheduleConfig,
  dayOfWeekToWeekdayName,
  weekdayNameToDayOfWeek,
  type ScheduleInput,
} from "@/lib/timetable-schedule";
import type { TimetableSlotListItem } from "@/lib/timetable";

export type AssignCellTarget = {
  dayOfWeek: number;
  periodIndex: number;
  startsAt: string;
  endsAt: string;
  slot?: TimetableSlotListItem;
};

type TimetableAssignGridProps = {
  schedule: ScheduleInput;
  slots: TimetableSlotListItem[];
  /** teacherAssignmentId → display label (subject · teacher) */
  assignmentLabels?: Record<string, string>;
  writesEnabled?: boolean;
  mutating?: boolean;
  onAssignCell: (target: AssignCellTarget) => void;
};

export function TimetableAssignGrid({
  schedule,
  slots,
  assignmentLabels = {},
  writesEnabled = false,
  mutating = false,
  onAssignCell,
}: TimetableAssignGridProps) {
  const config = useMemo(() => buildScheduleConfig(schedule), [schedule]);
  const teachingPeriods = useMemo(
    () => config.periodRows.filter((row) => !row.isBreak),
    [config.periodRows],
  );
  const activeDays = useMemo(
    () => config.days.filter((day) => day.active && day.periods > 0),
    [config.days],
  );

  const slotByKey = useMemo(() => {
    const map = new Map<string, TimetableSlotListItem>();
    for (const slot of slots) {
      map.set(`${slot.dayOfWeek}:${slot.periodIndex}`, slot);
    }
    return map;
  }, [slots]);

  if (activeDays.length === 0 || teachingPeriods.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-1 py-2">
        No working days or periods in this schedule. Edit the template and recreate.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Assign subjects for each period"
        hint="Click an empty cell to assign a subject · Publish when draft periods are ready"
      />
      <CardBody noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2 text-left font-medium sticky left-0 bg-muted/30">
                  Period
                </th>
                {activeDays.map((day) => (
                  <th key={day.name} className="px-3 py-2 text-left font-medium min-w-[7.5rem]">
                    {day.name.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachingPeriods.map((period, idx) => {
                const periodIndex = idx + 1;
                return (
                  <tr key={period.id} className="border-b border-border/70">
                    <td className="px-3 py-2 sticky left-0 bg-background">
                      <div className="font-medium">{period.label}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {period.start}–{period.end}
                      </div>
                    </td>
                    {activeDays.map((day) => {
                      const dayOfWeek = weekdayNameToDayOfWeek(day.name);
                      const cappedIndex = Math.min(periodIndex, day.periods || periodIndex);
                      if (periodIndex > (day.periods || 0)) {
                        return (
                          <td
                            key={`${day.name}-${period.id}`}
                            className="px-2 py-2 text-muted-foreground/40"
                          >
                            —
                          </td>
                        );
                      }
                      const slot = slotByKey.get(`${dayOfWeek}:${cappedIndex}`);
                      const label = slot
                        ? assignmentLabels[slot.teacherAssignmentId] ??
                          `Period ${slot.periodIndex}${
                            slot.status === "inactive" ? " · draft" : ""
                          }`
                        : null;
                      return (
                        <td key={`${day.name}-${period.id}`} className="px-2 py-2 align-top">
                          {writesEnabled ? (
                            <Button
                              size="sm"
                              variant={slot ? "outline" : "ghost"}
                              disabled={mutating}
                              className={`w-full h-auto min-h-9 justify-start whitespace-normal text-left text-[11px] ${
                                slot ? "" : "border border-dashed border-border"
                              }`}
                              onClick={() =>
                                onAssignCell({
                                  dayOfWeek,
                                  periodIndex: cappedIndex,
                                  startsAt: period.start,
                                  endsAt: period.end,
                                  slot,
                                })
                              }
                            >
                              {label ?? "Assign subject"}
                            </Button>
                          ) : (
                            <div className="rounded-md border border-border px-2 py-1.5 text-[11px]">
                              {label ?? (
                                <span className="text-muted-foreground">Empty</span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {config.periodRows.some((row) => row.isBreak) ? (
          <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
            Breaks in bell schedule:{" "}
            {config.periodRows
              .filter((row) => row.isBreak)
              .map((row) => `${row.breakName || row.label} (${row.start}–${row.end})`)
              .join(" · ")}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

/** Resolve weekday label for a slot (for tables without schedule). */
export function slotDayLabel(dayOfWeek: number): string {
  return dayOfWeekToWeekdayName(dayOfWeek);
}
