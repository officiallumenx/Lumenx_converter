import { useMemo, useState } from "react";
import { BookOpen, CalendarDays, Clock, User } from "lucide-react";
import { Card, CardBody, CardHeader } from "@lumenx/ui-admin";
import {
  buildScheduleConfig,
  weekdayNameToDayOfWeek,
  type ScheduleInput,
  type TimetableScheduleConfig,
} from "@/lib/timetable-schedule";
import type { TimetableSlotListItem } from "@/lib/timetable";
import type { TimetableSlot } from "@/lib/timetable-data";
import type { AssignCellTarget } from "@/components/timetable/TimetableAssignGrid";

type DayPeriodRow = {
  key: string;
  periodIndex: number;
  label: string;
  time: string;
  subject: string | null;
  teacher: string | null;
  emptyText: string;
  onOpen?: () => void;
};

function todayWeekdayName(): string {
  const names = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return names[new Date().getDay()] ?? "Monday";
}

function subjectAccent(subject: string | null): {
  primary: string;
  surface: string;
  chip: string;
  border: string;
} {
  if (!subject) {
    return {
      primary: "#64748b",
      surface: "color-mix(in oklab, #94a3b8 12%, transparent)",
      chip: "color-mix(in oklab, #94a3b8 18%, transparent)",
      border: "color-mix(in oklab, #94a3b8 35%, transparent)",
    };
  }
  const palette = [
    "#2563eb",
    "#7c3aed",
    "#0891b2",
    "#059669",
    "#d97706",
    "#e11d48",
    "#4f46e5",
  ];
  let hash = 0;
  for (let i = 0; i < subject.length; i += 1) {
    hash = (hash * 31 + subject.charCodeAt(i)) >>> 0;
  }
  const primary = palette[hash % palette.length]!;
  return {
    primary,
    surface: `color-mix(in oklab, ${primary} 12%, transparent)`,
    chip: `color-mix(in oklab, ${primary} 18%, transparent)`,
    border: `color-mix(in oklab, ${primary} 35%, transparent)`,
  };
}

function DayPicker({
  days,
  selected,
  onSelect,
  todayName,
  counts,
}: {
  days: string[];
  selected: string;
  onSelect: (day: string) => void;
  todayName: string;
  counts: Record<string, number>;
}) {
  return (
    <section
      className="rounded-xl border border-border bg-card p-3"
      data-swipe-nav-ignore
    >
      <div className="mb-2.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <CalendarDays className="size-3.5 text-primary" />
          Select day
        </span>
        <span className="truncate text-right">
          <span className="font-medium text-foreground">{selected}</span>
          {selected === todayName ? " · Today" : ""}
        </span>
      </div>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${Math.max(days.length, 1)}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Week days"
      >
        {days.map((day) => {
          const isSelected = day === selected;
          const isToday = day === todayName;
          const count = counts[day] ?? 0;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              className="flex min-w-0 flex-col items-center gap-1 touch-manipulation"
            >
              <span
                className={[
                  "grid size-9 place-items-center rounded-full text-[10px] font-semibold",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                      ? "border border-primary/50 bg-primary/10 text-primary"
                      : "border border-border bg-muted/40 text-foreground",
                ].join(" ")}
              >
                {day.slice(0, 3)}
              </span>
              <span
                className={[
                  "text-[9px] font-medium",
                  isSelected || isToday ? "text-primary" : "text-muted-foreground",
                ].join(" ")}
              >
                {isToday ? "Today" : count > 0 ? `${count}p` : "—"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PeriodCards({
  rows,
  emptyMessage,
}: {
  rows: DayPeriodRow[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ol className="space-y-2.5">
      {rows.map((row, index) => {
        const accent = subjectAccent(row.subject);
        const body = (
          <>
            <span
              className="absolute inset-y-0 left-0 w-1"
              style={{ backgroundColor: accent.primary }}
              aria-hidden
            />
            <div className="flex gap-3 py-3 pl-4 pr-3">
              <span
                className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums"
                style={{
                  backgroundColor: accent.chip,
                  color: accent.primary,
                }}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
                    style={{
                      color: accent.primary,
                      backgroundColor: accent.chip,
                      borderColor: `${accent.primary}33`,
                    }}
                  >
                    <BookOpen className="size-3 opacity-80" />
                    {row.subject ?? row.emptyText}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {row.label}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-medium tabular-nums text-foreground">
                    <Clock
                      className="size-3.5"
                      style={{ color: accent.primary }}
                    />
                    {row.time}
                  </span>
                  {row.teacher ? (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <User
                        className="size-3.5 shrink-0"
                        style={{ color: accent.primary }}
                      />
                      <span className="truncate">{row.teacher}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        );
        return (
          <li key={row.key}>
            {row.onOpen ? (
              <button
                type="button"
                onClick={row.onOpen}
                className="relative w-full overflow-hidden rounded-xl border text-left shadow-sm"
                style={{
                  backgroundColor: accent.surface,
                  borderColor: accent.border,
                }}
              >
                {body}
              </button>
            ) : (
              <div
                className="relative w-full overflow-hidden rounded-xl border text-left shadow-sm"
                style={{
                  backgroundColor: accent.surface,
                  borderColor: accent.border,
                }}
              >
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Connect-style day view for Admin API timetable (mobile). */
export function TimetableMobileDayView({
  schedule,
  slots,
  assignmentLabels = {},
  writesEnabled = false,
  mutating = false,
  onAssignCell,
}: {
  schedule: ScheduleInput;
  slots: TimetableSlotListItem[];
  assignmentLabels?: Record<string, string>;
  writesEnabled?: boolean;
  mutating?: boolean;
  onAssignCell: (target: AssignCellTarget) => void;
}) {
  const config = useMemo(() => buildScheduleConfig(schedule), [schedule]);
  const teachingCount = useMemo(
    () => config.periodRows.filter((row) => !row.isBreak).length,
    [config.periodRows],
  );
  const activeDays = useMemo(
    () => config.days.filter((day) => day.active && day.periods > 0),
    [config.days],
  );
  const dayNames = activeDays.map((d) => d.name);
  const todayName = todayWeekdayName();
  const [selectedDay, setSelectedDay] = useState(() =>
    dayNames.includes(todayName) ? todayName : (dayNames[0] ?? "Monday"),
  );

  const slotByKey = useMemo(() => {
    const map = new Map<string, TimetableSlotListItem>();
    for (const slot of slots) {
      map.set(`${slot.dayOfWeek}:${slot.periodIndex}`, slot);
    }
    return map;
  }, [slots]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const day of activeDays) {
      const dow = weekdayNameToDayOfWeek(day.name);
      let n = 0;
      for (let i = 1; i <= (day.periods || 0); i += 1) {
        if (slotByKey.has(`${dow}:${i}`)) n += 1;
      }
      out[day.name] = n;
    }
    return out;
  }, [activeDays, slotByKey]);

  const rows = useMemo(() => {
    const day = activeDays.find((d) => d.name === selectedDay);
    if (!day) return [] as DayPeriodRow[];
    const dayOfWeek = weekdayNameToDayOfWeek(day.name);
    const list: DayPeriodRow[] = [];
    let teachingIndex = 0;
    for (const period of config.periodRows) {
      if (period.isBreak) {
        list.push({
          key: `break-${period.id}`,
          periodIndex: 0,
          label: period.breakName || period.label || "Break",
          time: `${period.start}–${period.end}`,
          subject: period.breakName || period.label || "Break",
          teacher: null,
          emptyText: "Break",
        });
        continue;
      }
      teachingIndex += 1;
      const periodIndex = teachingIndex;
      if (periodIndex > (day.periods || 0)) continue;
      const slot = slotByKey.get(`${dayOfWeek}:${periodIndex}`);
      const label = slot
        ? assignmentLabels[slot.teacherAssignmentId] ??
          `Period ${slot.periodIndex}`
        : null;
      const [subjectPart, teacherPart] = (label ?? "")
        .split("·")
        .map((part) => part.trim());
      list.push({
        key: `${dayOfWeek}:${periodIndex}`,
        periodIndex,
        label: period.label?.split("·")[0]?.trim() || `P${periodIndex}`,
        time: `${period.start}–${period.end}`,
        subject: slot ? subjectPart || label : null,
        teacher: slot ? teacherPart || null : null,
        emptyText: writesEnabled ? "Assign subject" : "Empty",
        onOpen:
          writesEnabled && !mutating
            ? () =>
                onAssignCell({
                  dayOfWeek,
                  periodIndex,
                  startsAt: period.start,
                  endsAt: period.end,
                  slot,
                })
            : undefined,
      });
    }
    return list;
  }, [
    activeDays,
    selectedDay,
    config.periodRows,
    slotByKey,
    assignmentLabels,
    writesEnabled,
    mutating,
    onAssignCell,
  ]);

  if (activeDays.length === 0 || teachingCount === 0) {
    return (
      <p className="px-1 py-2 text-sm text-muted-foreground">
        No working days or periods in this schedule.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Daily timetable"
        hint="Pick a day · tap a period to assign"
      />
      <CardBody className="space-y-3">
        <DayPicker
          days={dayNames}
          selected={selectedDay}
          onSelect={setSelectedDay}
          todayName={todayName}
          counts={counts}
        />
        <PeriodCards
          rows={rows}
          emptyMessage="No periods for this day."
        />
      </CardBody>
    </Card>
  );
}

/** Connect-style day view for Admin demo week grid (mobile). */
export function TimetableMobileDayViewDemo({
  grid,
  schedule,
  onEdit,
}: {
  grid: (TimetableSlot | null)[][];
  schedule: TimetableScheduleConfig;
  onEdit: (day: number, period: number) => void;
}) {
  const activeDays = useMemo(
    () => schedule.days.filter((d) => d.active && d.periods > 0),
    [schedule.days],
  );
  const dayNames = activeDays.map((d) => d.name);
  const todayName = todayWeekdayName();
  const [selectedDay, setSelectedDay] = useState(() =>
    dayNames.includes(todayName) ? todayName : (dayNames[0] ?? "Monday"),
  );

  const teachingPeriods = useMemo(
    () => schedule.periodRows.filter((row) => !row.isBreak),
    [schedule.periodRows],
  );

  const dayIndex = Math.max(
    0,
    dayNames.findIndex((d) => d === selectedDay),
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    activeDays.forEach((day, di) => {
      let n = 0;
      const col = grid[di] ?? [];
      for (let p = 0; p < (day.periods || 0); p += 1) {
        if (col[p]) n += 1;
      }
      out[day.name] = n;
    });
    return out;
  }, [activeDays, grid]);

  const rows = useMemo(() => {
    const day = activeDays[dayIndex];
    if (!day) return [] as DayPeriodRow[];
    const col = grid[dayIndex] ?? [];
    const list: DayPeriodRow[] = [];
    teachingPeriods.forEach((period, p) => {
      if (p >= (day.periods || 0)) return;
      const slot = col[p] ?? null;
      list.push({
        key: `${dayIndex}:${p}`,
        periodIndex: p + 1,
        label: period.id || `P${p + 1}`,
        time: `${period.start}–${period.end}`,
        subject: slot?.subject ?? null,
        teacher: slot?.teacher ?? null,
        emptyText: "Assign",
        onOpen: () => onEdit(dayIndex, p),
      });
    });
    return list;
  }, [activeDays, dayIndex, grid, teachingPeriods, onEdit]);

  if (activeDays.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No active days in schedule.</p>
    );
  }

  return (
    <div className="space-y-3">
      <DayPicker
        days={dayNames}
        selected={selectedDay}
        onSelect={setSelectedDay}
        todayName={todayName}
        counts={counts}
      />
      <PeriodCards rows={rows} emptyMessage="No periods for this day." />
    </div>
  );
}
