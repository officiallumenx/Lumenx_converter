import { useMemo } from "react";
import { Coffee } from "lucide-react";
import { Card, CardBody, CardHeader } from "@lumenx/ui-admin";
import {
  buildScheduleConfig,
  dayOfWeekToWeekdayName,
  weekdayNameToDayOfWeek,
  type ScheduleInput,
} from "@/lib/timetable-schedule";
import type { TimetableSlotListItem } from "@/lib/timetable";
import { subjectTheme } from "@/components/timetable/timetable-theme";

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
  title?: string;
  writesEnabled?: boolean;
  mutating?: boolean;
  onAssignCell: (target: AssignCellTarget) => void;
};

function splitAssignmentLabel(label: string | null): {
  subject: string | null;
  teacher: string | null;
} {
  if (!label?.trim()) return { subject: null, teacher: null };
  const [subjectPart, teacherPart] = label.split("·").map((part) => part.trim());
  return {
    subject: subjectPart || label.trim(),
    teacher: teacherPart || null,
  };
}

function CellContent({
  subject,
  teacher,
  emptyText,
}: {
  subject: string | null;
  teacher: string | null;
  emptyText: string;
}) {
  if (!subject) return <>{emptyText}</>;
  return (
    <>
      <div className="lx-timetable-slot__subject">{subject}</div>
      {teacher ? (
        <div className="lx-timetable-slot__teacher">
          <span className="truncate">{teacher}</span>
        </div>
      ) : null}
    </>
  );
}

export function TimetableAssignGrid({
  schedule,
  slots,
  assignmentLabels = {},
  title = "Weekly timetable",
  writesEnabled = false,
  mutating = false,
  onAssignCell,
}: TimetableAssignGridProps) {
  const config = useMemo(() => buildScheduleConfig(schedule), [schedule]);
  const teachingCount = useMemo(
    () => config.periodRows.filter((row) => !row.isBreak).length,
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

  const usedSubjects = useMemo(() => {
    const names = new Set<string>();
    for (const slot of slots) {
      const label = assignmentLabels[slot.teacherAssignmentId];
      const { subject } = splitAssignmentLabel(label ?? null);
      if (subject) names.add(subject);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [slots, assignmentLabels]);

  if (activeDays.length === 0 || teachingCount === 0) {
    return (
      <p className="text-sm text-muted-foreground px-1 py-2">
        No working days or periods in this schedule. Edit the template and recreate.
      </p>
    );
  }

  let teachingIndex = 0;

  return (
    <Card className="hidden md:block w-fit max-w-full">
      <div className="lx-timetable-assign">
      <CardHeader
        title={title}
        hint="Days across the top · periods on the left · color by subject"
      />
      {usedSubjects.length > 0 ? (
        <div className="lx-timetable-legend px-4 pb-2 sm:px-5">
          <span className="lx-timetable-legend__label">Subjects</span>
          <div className="lx-timetable-legend__items">
            {usedSubjects.map((name) => {
              const theme = subjectTheme(name);
              return (
                <span
                  key={name}
                  className={`lx-timetable-legend__chip border-l-4 ${theme.bg} ${theme.border}`}
                >
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
      <CardBody noPadding>
        <div className="lx-timetable-scroll" data-swipe-nav-ignore>
          <table className="lx-timetable-grid border-collapse text-sm">
            <thead>
              <tr>
                <th className="lx-timetable-grid__time-col font-semibold">
                  Period
                </th>
                {activeDays.map((day) => (
                  <th key={day.name} className="lx-timetable-grid__day-col">
                    <span className="lx-timetable-grid__day-name">
                      {day.name.slice(0, 3)}
                    </span>
                    <span className="lx-timetable-grid__day-meta hidden sm:block">
                      {day.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.periodRows.map((period) => {
                if (period.isBreak) {
                  const breakLabel = period.breakName || period.label || "Break";
                  const isLunch = /lunch/i.test(breakLabel);
                  return (
                    <tr
                      key={period.id}
                      className={`lx-timetable-grid__break-row ${
                        isLunch ? "lx-timetable-grid__break-row--lunch" : ""
                      }`}
                    >
                      <td colSpan={activeDays.length + 1}>
                        <Coffee className="size-3.5 shrink-0" aria-hidden />
                        <span>
                          {breakLabel} · {period.start} – {period.end}
                        </span>
                      </td>
                    </tr>
                  );
                }

                teachingIndex += 1;
                const periodIndex = teachingIndex;
                return (
                  <tr key={period.id}>
                    <td className="lx-timetable-grid__time-col">
                      <span className="lx-timetable-grid__period-id">
                        {period.label?.split("·")[0]?.trim() || `P${periodIndex}`}
                      </span>
                      <span className="lx-timetable-grid__period-time">
                        {period.start}–{period.end}
                      </span>
                    </td>
                    {activeDays.map((day) => {
                      const dayOfWeek = weekdayNameToDayOfWeek(day.name);
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
                      const slot = slotByKey.get(`${dayOfWeek}:${periodIndex}`);
                      const label = slot
                        ? assignmentLabels[slot.teacherAssignmentId] ??
                          `Period ${slot.periodIndex}${
                            slot.status === "inactive" ? " · draft" : ""
                          }`
                        : null;
                      const { subject, teacher } = splitAssignmentLabel(label);
                      const theme = subject ? subjectTheme(subject) : null;
                      const filledClass = theme
                        ? `lx-timetable-slot lx-timetable-slot--filled border-l-2 ${theme.border} ${theme.bg}`
                        : "lx-timetable-slot lx-timetable-slot--filled border-border bg-muted/40";

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
                                  ? filledClass
                                  : "lx-timetable-slot lx-timetable-slot--empty"
                              }
                              onClick={() =>
                                onAssignCell({
                                  dayOfWeek,
                                  periodIndex,
                                  startsAt: period.start,
                                  endsAt: period.end,
                                  slot,
                                })
                              }
                            >
                              <CellContent
                                subject={subject}
                                teacher={teacher}
                                emptyText="Assign"
                              />
                            </button>
                          ) : (
                            <div
                              className={
                                slot
                                  ? filledClass
                                  : "lx-timetable-slot lx-timetable-slot--empty pointer-events-none opacity-70"
                              }
                            >
                              <CellContent
                                subject={subject}
                                teacher={teacher}
                                emptyText="Empty"
                              />
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
      </CardBody>
      </div>
    </Card>
  );
}

/** Resolve weekday label for a slot (for tables without schedule). */
export function slotDayLabel(dayOfWeek: number): string {
  return dayOfWeekToWeekdayName(dayOfWeek);
}
