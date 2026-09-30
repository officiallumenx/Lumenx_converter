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
        title="Weekly timetable"
        hint="Table by period × day · swipe sideways on phone to see all days"
      />
      <CardBody noPadding>
        <div className="lx-timetable-scroll" data-swipe-nav-ignore>
          <table className="lx-timetable-grid w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="lx-timetable-grid__time-col text-left font-semibold">
                  Period
                </th>
                {activeDays.map((day) => (
                  <th key={day.name} className="lx-timetable-grid__day-col">
                    <span className="lx-timetable-grid__day-name">
                      {day.name.slice(0, 3)}
                    </span>
                    <span className="lx-timetable-grid__day-meta hidden sm:block">
                      {day.periods} periods
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachingPeriods.map((period, idx) => {
                const periodIndex = idx + 1;
                return (
                  <tr key={period.id}>
                    <td className="lx-timetable-grid__time-col">
                      <span className="lx-timetable-grid__period-id">
                        {period.label || `P${periodIndex}`}
                      </span>
                      <span className="lx-timetable-grid__period-time">
                        {period.start}–{period.end}
                      </span>
                    </td>
                    {activeDays.map((day) => {
                      const dayOfWeek = weekdayNameToDayOfWeek(day.name);
                      const cappedIndex = Math.min(
                        periodIndex,
                        day.periods || periodIndex,
                      );
                      if (periodIndex > (day.periods || 0)) {
                        return (
                          <td
                            key={`${day.name}-${period.id}`}
                            className="lx-timetable-grid__na"
                          >
                            <span>—</span>
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
                      const [subjectPart, teacherPart] = (label ?? "")
                        .split("·")
                        .map((part) => part.trim());
                      return (
                        <td
                          key={`${day.name}-${period.id}`}
                          className="lx-timetable-grid__cell"
                        >
                          {writesEnabled ? (
                            <button
                              type="button"
                              disabled={mutating}
                              className={
                                slot
                                  ? "lx-timetable-slot lx-timetable-slot--filled border-border bg-primary/8 text-left"
                                  : "lx-timetable-slot lx-timetable-slot--empty"
                              }
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
                              {slot ? (
                                <>
                                  <div className="lx-timetable-slot__subject">
                                    {subjectPart || label}
                                  </div>
                                  {teacherPart ? (
                                    <div className="lx-timetable-slot__teacher">
                                      {teacherPart}
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                "Assign"
                              )}
                            </button>
                          ) : (
                            <div
                              className={
                                slot
                                  ? "lx-timetable-slot lx-timetable-slot--filled border-border bg-muted/40"
                                  : "lx-timetable-slot lx-timetable-slot--empty pointer-events-none opacity-70"
                              }
                            >
                              {slot ? (
                                <>
                                  <div className="lx-timetable-slot__subject">
                                    {subjectPart || label}
                                  </div>
                                  {teacherPart ? (
                                    <div className="lx-timetable-slot__teacher">
                                      {teacherPart}
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                "Empty"
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
          <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
            Breaks:{" "}
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
