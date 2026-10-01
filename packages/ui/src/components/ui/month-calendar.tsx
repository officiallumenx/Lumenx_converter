import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

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

type MiniOption = { value: string; label: string };

/** Themed dropdown (no native OS chrome) for month/year headers. */
function CalendarMiniSelect({
  "aria-label": ariaLabel,
  value,
  options,
  onChange,
  className,
}: {
  "aria-label": string;
  value: string;
  options: MiniOption[];
  onChange: (next: string) => void;
  className?: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-9 w-full min-w-0 items-center justify-between gap-1 rounded-md border border-border bg-background px-2 text-sm font-medium text-foreground touch-manipulation transition-colors hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40"
      >
        <span className="min-w-0 truncate">{selected?.label ?? "Select…"}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-labelledby={id}
          className="lx-themed-menu absolute left-0 right-0 top-[calc(100%+4px)] z-[60] max-h-56 overflow-y-auto rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-md"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm transition-colors",
                  active
                    ? "bg-primary/12 font-medium text-primary"
                    : "text-popover-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                {active ? <Check className="size-3.5 shrink-0 text-primary" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

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
    () => Array.from({ length: endYear - startYear + 1 }, (_, i) => endYear - i),
    [startYear, endYear],
  );
  const monthOptions = useMemo(
    () => MONTH_LABELS.map((label, i) => ({ value: String(i), label })),
    [],
  );
  const yearOptions = useMemo(
    () => years.map((y) => ({ value: String(y), label: String(y) })),
    [years],
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
          <CalendarMiniSelect
            aria-label="Month"
            value={String(monthIndex)}
            options={monthOptions}
            onChange={(next) => onMonthChange(new Date(year, Number(next), 1))}
            className="flex-1"
          />
          <CalendarMiniSelect
            aria-label="Year"
            value={String(year)}
            options={yearOptions}
            onChange={(next) => onMonthChange(new Date(Number(next), monthIndex, 1))}
            className="max-w-[5.75rem] flex-none tabular-nums"
          />
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
