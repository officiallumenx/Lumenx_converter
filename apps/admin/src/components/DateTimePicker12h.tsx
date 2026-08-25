import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  cn,
  useIsMobile,
} from "@lumenx/ui";
import { toLocalIsoDate } from "@lumenx/utils";

/** Stored value: `YYYY-MM-DDTHH:mm` (same shape as datetime-local). */

export function parseDateTimeLocal(value: string): { date: string; time: string } {
  const [date = "", timePart = ""] = (value || "").split("T");
  return { date, time: timePart.slice(0, 5) };
}

export function toDateTimeLocal(date: string, time: string): string {
  if (!date) return "";
  const t = (time || "09:00").slice(0, 5);
  return `${date}T${t}`;
}

export function parseTime24(value: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  const m = /^(\d{1,2}):(\d{2})$/.exec((value || "").trim());
  let h24 = 9;
  let minute = 0;
  if (m) {
    h24 = Math.min(23, Math.max(0, Number(m[1])));
    minute = Math.min(59, Math.max(0, Number(m[2])));
  }
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, period };
}

export function toTime24(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h = hour12 % 12;
  if (period === "PM") h += 12;
  if (period === "AM" && hour12 === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatDateTime12h(value: string): string {
  const { date, time } = parseDateTimeLocal(value);
  if (!date) return "";
  const { hour12, minute, period } = parseTime24(time || "09:00");
  try {
    const d = new Date(`${date}T12:00:00`);
    const dateLabel = Number.isNaN(d.getTime())
      ? date
      : d.toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
    return `${dateLabel} · ${hour12}:${String(minute).padStart(2, "0")} ${period}`;
  } catch {
    return `${date} · ${hour12}:${String(minute).padStart(2, "0")} ${period}`;
  }
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

function dateAtNoon(iso: string) {
  return new Date(`${iso}T12:00:00`);
}

function toIsoDate(d: Date): string {
  return toLocalIsoDate(d);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Even 7×N month grid — fixed cell size, consistent gaps. */
function MonthCalendar({
  month,
  selectedIso,
  minDate,
  onMonthChange,
  onSelect,
}: {
  month: Date;
  selectedIso?: string;
  minDate?: Date;
  onMonthChange: (d: Date) => void;
  onSelect: (iso: string) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const todayIso = toIsoDate(new Date());

  const cells = useMemo(() => {
    const first = new Date(year, monthIndex, 1);
    // Monday-first: Sun=0 → 6, Mon=1 → 0, …
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
        iso: toIsoDate(new Date(year, monthIndex, dayNum)),
      });
    }
    return list;
  }, [year, monthIndex]);

  const label = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="w-[272px] select-none p-3">
      <div className="mb-3 flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1 text-center text-sm font-semibold tracking-tight text-foreground">
          {label}
        </div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
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
          if (!cell) {
            return <div key={`e-${i}`} className="size-8" aria-hidden />;
          }
          const isSelected = cell.iso === selectedIso;
          const isToday = cell.iso === todayIso;
          const disabled =
            minDate != null && startOfDay(dateAtNoon(cell.iso)) < startOfDay(minDate);

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(cell.iso)}
              className={cn(
                "flex size-8 items-center justify-center rounded-md text-sm tabular-nums transition-colors",
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

/**
 * One field: calendar + 12-hour time (Hours · Mins · AM/PM) in the same view.
 */
export function DateTimePicker12h({
  value,
  onChange,
  min,
  placeholder = "Select date & time",
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  /** `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` */
  min?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { date: valueDate, time: valueTime } = parseDateTimeLocal(value);

  const [draftDate, setDraftDate] = useState(valueDate);
  const [draftTime, setDraftTime] = useState(valueTime || "09:00");
  const [month, setMonth] = useState<Date>(() =>
    valueDate ? dateAtNoon(valueDate) : new Date(),
  );

  useEffect(() => {
    if (!open) return;
    setDraftDate(valueDate);
    setDraftTime(valueTime || "09:00");
    setMonth(valueDate ? dateAtNoon(valueDate) : new Date());
  }, [open, valueDate, valueTime]);

  const { hour12, minute, period } = parseTime24(draftTime);
  const minDateIso = min ? parseDateTimeLocal(min).date || min.slice(0, 10) : "";
  const minDate = minDateIso ? dateAtNoon(minDateIso) : undefined;

  const isMobile = useIsMobile();
  const display = useMemo(() => (value ? formatDateTime12h(value) : ""), [value]);

  const commit = (nextDate: string, nextTime: string) => {
    if (!nextDate) return;
    onChange(toDateTimeLocal(nextDate, nextTime || "09:00"));
  };

  const pickDate = (iso: string) => {
    setDraftDate(iso);
    setMonth(dateAtNoon(iso));
    commit(iso, draftTime || "09:00");
  };

  const pickTime = (nextTime: string) => {
    const d = draftDate || toIsoDate(new Date());
    setDraftDate(d);
    setDraftTime(nextTime);
    commit(d, nextTime);
  };

  const trigger = (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "flex h-10 min-h-10 w-full items-center gap-2 rounded-md border border-border bg-background px-3 text-left text-sm transition-colors hover:bg-surface-hover disabled:opacity-50",
        !display && "text-muted-foreground",
      )}
    >
      <CalendarDays className="size-4 shrink-0 text-primary" />
      <span className="truncate">{display || placeholder}</span>
    </button>
  );

  const pickerBody = (
        <div className="flex flex-col bg-background sm:flex-row">
          <div className="border-b border-border sm:border-b-0 sm:border-r">
            <div className="border-b border-border bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Date
            </div>
            <MonthCalendar
              month={month}
              selectedIso={draftDate || undefined}
              minDate={minDate}
              onMonthChange={setMonth}
              onSelect={pickDate}
            />
          </div>

          <div className="flex w-full flex-col sm:w-[204px]">
            <div className="border-b border-border bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Time · 12-hour
            </div>
            <div className="grid grid-cols-3 border-b border-border">
              <div className="border-r border-border px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Hours
              </div>
              <div className="border-r border-border px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Mins
              </div>
              <div className="px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                AM / PM
              </div>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-3">
              <div
                className="max-h-[220px] overflow-y-auto border-r border-border py-1"
                role="listbox"
                aria-label="Hours"
              >
                {HOURS.map((h) => {
                  const active = h === hour12;
                  return (
                    <button
                      key={h}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => pickTime(toTime24(h, minute, period))}
                      className={cn(
                        "mx-1 flex h-8 w-[calc(100%-0.5rem)] items-center justify-center rounded-md font-mono text-sm tabular-nums transition-colors",
                        active
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      {String(h).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
              <div
                className="max-h-[220px] overflow-y-auto border-r border-border py-1"
                role="listbox"
                aria-label="Minutes"
              >
                {MINUTES.map((m) => {
                  const active = m === minute;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => pickTime(toTime24(hour12, m, period))}
                      className={cn(
                        "mx-1 flex h-8 w-[calc(100%-0.5rem)] items-center justify-center rounded-md font-mono text-sm tabular-nums transition-colors",
                        active
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      {String(m).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
              <div className="flex max-h-[220px] flex-col justify-center gap-2 p-2">
                {(["AM", "PM"] as const).map((p) => {
                  const active = p === period;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => pickTime(toTime24(hour12, minute, p))}
                      className={cn(
                        "rounded-md py-3 text-sm font-semibold transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-border p-2">
              <Button type="button" size="sm" className="w-full" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
  );

  if (isMobile) {
    return (
      <>
        <div onClick={() => !disabled && setOpen(true)}>{trigger}</div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="flex max-h-[min(92dvh,calc(100dvh-var(--lx-safe-top,0px)))] flex-col gap-0 overflow-y-auto rounded-t-2xl p-0 [&>button]:top-3"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Select date and time</SheetTitle>
              <SheetDescription>Pick a calendar date and 12-hour time.</SheetDescription>
            </SheetHeader>
            {pickerBody}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="z-[10050] w-auto max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-popover p-0 text-popover-foreground shadow-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.stopPropagation()}
        onFocusOutside={(e) => e.preventDefault()}
      >
        {pickerBody}
      </PopoverContent>
    </Popover>
  );
}
