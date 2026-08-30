import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "../../lib/utils";

export const WEEKDAYS_SHORT = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

export function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDateLocal(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString("default", { month: "long" }),
);

/** Default year window: 100 years back, 10 years forward — suitable for DOB and scheduling. */
export function resolveCalendarYearRange(min?: string, max?: string) {
  const nowYear = new Date().getFullYear();
  let startYear = nowYear - 100;
  let endYear = nowYear + 10;
  const minYear = min?.slice(0, 4);
  const maxYear = max?.slice(0, 4);
  if (minYear && /^\d{4}$/.test(minYear)) startYear = Math.min(startYear, Number(minYear));
  if (maxYear && /^\d{4}$/.test(maxYear)) endYear = Math.max(endYear, Number(maxYear));
  if (startYear > endYear) endYear = startYear;
  return { startYear, endYear };
}

export function resolveCalendarMonthBounds(min?: string, max?: string) {
  const { startYear, endYear } = resolveCalendarYearRange(min, max);
  return {
    startMonth: new Date(startYear, 0, 1),
    endMonth: new Date(endYear, 11, 1),
  };
}

const selectClass =
  "h-9 min-h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm font-medium text-foreground touch-manipulation focus:outline-none focus:ring-2 focus:ring-ring/40";

export type MonthCalendarProps = {
  month: Date;
  selectedIso?: string;
  min?: string;
  max?: string;
  onMonthChange: (d: Date) => void;
  onSelect: (iso: string) => void;
  className?: string;
};

export function MonthCalendar({
  month,
  selectedIso,
  min,
  max,
  onMonthChange,
  onSelect,
  className,
}: MonthCalendarProps) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const todayIso = toIsoDateLocal(new Date());
  const { startYear, endYear } = useMemo(() => resolveCalendarYearRange(min, max), [min, max]);
  const years = useMemo(
    () => Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i),
    [startYear, endYear],
  );

  const cells = useMemo(() => {
    const first = new Date(year, monthIndex, 1);
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const total = Math.ceil((lead + daysInMonth) / 7) * 7;
    const list: ({ iso: string; day: number } | null)[] = [];
    for (let i = 0; i < total; i++) {
      const dayNum = i - lead + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        list.push(null);
        continue;
      }
      list.push({
        day: dayNum,
        iso: toIsoDateLocal(new Date(year, monthIndex, dayNum)),
      });
    }
    return list;
  }, [year, monthIndex]);

  return (
    <div className={cn("w-[min(100%,288px)] select-none p-3", className)}>
      <div className="mb-3 flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground touch-manipulation"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <select
            aria-label="Month"
            value={monthIndex}
            onChange={(e) => onMonthChange(new Date(year, Number(e.target.value), 1))}
            className={selectClass}
          >
            {MONTH_LABELS.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Year"
            value={year}
            onChange={(e) => onMonthChange(new Date(Number(e.target.value), monthIndex, 1))}
            className={cn(selectClass, "max-w-[5.75rem] flex-none tabular-nums")}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground touch-manipulation"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {WEEKDAYS_SHORT.map((d) => (
          <div
            key={d}
            className="flex h-7 items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e-${i}`} className="size-9" aria-hidden />;
          const isSelected = cell.iso === selectedIso;
          const isToday = cell.iso === todayIso;
          const disabled = (min != null && cell.iso < min) || (max != null && cell.iso > max);

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(cell.iso)}
              className={cn(
                "flex size-9 items-center justify-center rounded-md text-sm tabular-nums transition-colors touch-manipulation",
                disabled && "cursor-not-allowed text-muted-foreground/30",
                !disabled && !isSelected && "text-foreground hover:bg-muted",
                !disabled && !isSelected && isToday && "font-semibold text-primary ring-1 ring-primary/35",
                isSelected && "bg-primary font-semibold text-primary-foreground hover:bg-primary",
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
