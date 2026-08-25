import { useMemo } from "react";
import { cn } from "@lumenx/ui";
import {
  connectMonthDayBase,
  connectMonthDayMarked,
  connectMonthDayMuted,
  connectMonthDaySelected,
  connectMonthDayToday,
} from "@/lib/connect-calendar-theme";
import {
  buildMonthGrid,
  calendarMarkMap,
  type CalendarActivityMark,
} from "@/activity-workspace/hub/calendar";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function ActivityCalendarPreview({
  marks,
  selectedDate,
  onSelectDate,
  className,
}: {
  marks: CalendarActivityMark[];
  selectedDate?: string | null;
  onSelectDate?: (iso: string) => void;
  className?: string;
}) {
  const { monthLabel, todayIso, cells } = useMemo(() => buildMonthGrid(), []);
  const markMap = useMemo(() => calendarMarkMap(marks), [marks]);

  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-3 font-display text-sm font-semibold text-foreground">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_SHORT.map((w) => (
          <div
            key={w}
            className="py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            {w}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`empty-${i}`} className="aspect-square" aria-hidden />;
          }
          const mark = markMap.get(cell.iso);
          const isToday = cell.iso === todayIso;
          const isSelected = selectedDate === cell.iso;

          const classes = cn(
            connectMonthDayBase,
            "relative text-sm",
            !mark && connectMonthDayMuted,
            mark && connectMonthDayMarked,
            isToday && connectMonthDayToday,
            isSelected && connectMonthDaySelected,
            onSelectDate && "cursor-pointer hover:border-primary/40 hover:bg-primary/[0.06]",
          );

          if (onSelectDate) {
            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => onSelectDate(cell.iso)}
                className={classes}
                title={mark ? `${mark.count} item${mark.count === 1 ? "" : "s"}` : undefined}
              >
                {cell.day}
                {mark && mark.count > 0 ? (
                  <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
                ) : null}
              </button>
            );
          }

          return (
            <div
              key={cell.iso}
              className={classes}
              title={mark ? `${mark.count} item${mark.count === 1 ? "" : "s"}` : undefined}
            >
              {cell.day}
              {mark && mark.count > 0 ? (
                <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Tap a day to see what is planned. Dots mean something is scheduled.
      </p>
    </div>
  );
}
