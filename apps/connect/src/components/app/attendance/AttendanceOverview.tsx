import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { AttendanceSummaryMetrics } from "@/components/app/attendance/AttendanceSummaryMetrics";
import {
  AttendanceDatePicker,
  syncCalendarMonthFromIso,
} from "@/components/app/attendance/AttendanceDatePicker";
import { Button, cn, Badge } from "@lumenx/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lumenx/ui";
import {
  buildAttendanceDays,
  computeAttendanceSummary,
  calendarLeadingBlanks,
  formatDisplayDate,
  holidaysInMonth,
  holidaysInRange,
  isoFromParts,
  listSelectableMonths,
  monthBounds,
  monthLabel,
  normalizeIsoRange,
  shiftMonth,
} from "@/lib/attendance/calendar";
import type { AttendanceDayStatus } from "@/lib/attendance/types";

type AttendanceOverviewProps = {
  title?: string;
  subtitle: string;
  seed?: number;
  maxYear?: number;
  maxMonth?: number;
};

export function AttendanceOverview({
  title = "Attendance",
  subtitle,
  seed = 0,
}: AttendanceOverviewProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const bounds = useMemo(() => monthBounds(year, month), [year, month]);
  const days = useMemo(() => buildAttendanceDays(year, month, seed), [year, month, seed]);
  const leadingBlanks = calendarLeadingBlanks(year, month);
  const selectableMonths = useMemo(() => listSelectableMonths(12), []);

  const dayRange = useMemo(() => {
    if (!rangeStart || !rangeEnd) return undefined;
    return normalizeIsoRange(rangeStart, rangeEnd);
  }, [rangeStart, rangeEnd]);

  const summary = useMemo(
    () => computeAttendanceSummary(days, year, month, dayRange),
    [days, year, month, dayRange],
  );

  const monthHolidays = useMemo(() => {
    if (dayRange) {
      return holidaysInRange(dayRange.startIso, dayRange.endIso).filter((h) =>
        h.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}-`),
      );
    }
    return holidaysInMonth(year, month);
  }, [year, month, dayRange]);

  const today = now.getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const canGoNext =
    year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth());

  const goPrev = () => {
    const next = shiftMonth(year, month, -1);
    setYear(next.year);
    setMonth(next.month);
  };

  const goNext = () => {
    if (!canGoNext) return;
    const next = shiftMonth(year, month, 1);
    setYear(next.year);
    setMonth(next.month);
  };

  const onMonthSelect = (value: string) => {
    const [y, m] = value.split("-").map(Number);
    setYear(y);
    setMonth(m);
  };

  const clearRange = () => {
    setRangeStart("");
    setRangeEnd("");
  };

  const setFromDate = (iso: string) => {
    setRangeStart(iso);
    syncCalendarMonthFromIso(iso, setYear, setMonth);
    if (rangeEnd && iso > rangeEnd) setRangeEnd("");
  };

  const setToDate = (iso: string) => {
    setRangeEnd(iso);
    syncCalendarMonthFromIso(iso, setYear, setMonth);
    if (rangeStart && iso < rangeStart) setRangeStart(iso);
  };

  const onDayClick = (day: number, status: AttendanceDayStatus) => {
    if (status === "future") return;
    const iso = isoFromParts(year, month, day);

    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(iso);
      setRangeEnd("");
      return;
    }

    if (iso < rangeStart) {
      setRangeStart(iso);
      setRangeEnd("");
      return;
    }

    setRangeEnd(iso);
  };

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />

      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-0 items-center gap-1">
          <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={goPrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <Select value={`${year}-${month}`} onValueChange={onMonthSelect}>
            <SelectTrigger className="h-10 min-w-[10rem] rounded-xl">
              <SelectValue>{monthLabel(year, month)}</SelectValue>
            </SelectTrigger>
            <SelectContent position="popper" className="z-[100] max-h-64">
              {selectableMonths.map((m) => (
                <SelectItem key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl shrink-0"
            onClick={goNext}
            disabled={!canGoNext}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <AttendanceDatePicker
            label="From date"
            value={rangeStart}
            onChange={setFromDate}
            min={bounds.start}
            max={rangeEnd || bounds.end}
            placeholder="Start date"
          />
          <AttendanceDatePicker
            label="To date"
            value={rangeEnd}
            onChange={setToDate}
            min={rangeStart || bounds.start}
            max={bounds.end}
            placeholder="End date"
          />
          {(rangeStart || rangeEnd) && (
            <Button type="button" variant="ghost" className="rounded-xl shrink-0 h-10" onClick={clearRange}>
              Full month
            </Button>
          )}
        </div>
      </div>

      {summary.rangeLabel ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{summary.rangeLabel}</span>
          {!rangeEnd && rangeStart ? (
            <span> · tap an end date on the calendar or pick &quot;To date&quot;</span>
          ) : null}
        </p>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">
          Tip: click two days on the calendar below to select a custom range.
        </p>
      )}

      <AttendanceSummaryMetrics summary={summary} />

      {monthHolidays.length > 0 ? (
        <SectionCard title="Holidays" className="mb-5">
          <div className="space-y-2">
            {monthHolidays.map((h) => (
              <div
                key={h.id}
                className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm">{h.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{h.purpose}</div>
                </div>
                <div className="shrink-0 text-xs font-medium text-primary whitespace-nowrap">
                  {formatDisplayDate(h.date)}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4 shrink-0" />
            <span>{summary.rangeLabel ?? summary.monthLabel}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <LegendDot label="Present" cls="bg-success/15 text-success border-success/20" />
            <LegendDot label="Absent" cls="bg-destructive/10 text-destructive border-destructive/20" />
            <LegendDot label="Leave" cls="bg-warning/15 text-warning-foreground border-warning/30" />
            <LegendDot label="Holiday" cls="bg-muted text-muted-foreground border-border" />
            {(dayRange || rangeStart) && (
              <LegendDot label="In range" cls="bg-primary/10 text-primary border-primary/30" />
            )}
          </div>
        </div>
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid min-w-0 grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square" aria-hidden />
          ))}
          {days.map((d) => {
            const iso = isoFromParts(year, month, d.day);
            const inRange = dayRange
              ? iso >= dayRange.startIso && iso <= dayRange.endIso
              : rangeStart === iso;
            const dimmed = Boolean((dayRange || rangeStart) && !inRange);
            const isRangeStart = dayRange ? dayRange.startIso === iso : rangeStart === iso;
            const isRangeEnd = dayRange?.endIso === iso;
            const isRangeMiddle = Boolean(dayRange && inRange && !isRangeStart && !isRangeEnd);

            return (
              <DayCell
                key={d.day}
                day={d.day}
                status={d.status}
                holidayTitle={d.holidayTitle}
                isToday={isCurrentMonth && d.day === today}
                dimmed={dimmed}
                inRange={inRange}
                isRangeStart={isRangeStart}
                isRangeEnd={isRangeEnd}
                isRangeMiddle={isRangeMiddle}
                onClick={() => onDayClick(d.day, d.status)}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}

function DayCell({
  day,
  status,
  holidayTitle,
  isToday,
  dimmed,
  inRange,
  isRangeStart,
  isRangeEnd,
  isRangeMiddle,
  onClick,
}: {
  day: number;
  status: AttendanceDayStatus;
  holidayTitle?: string;
  isToday: boolean;
  dimmed: boolean;
  inRange: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isRangeMiddle: boolean;
  onClick: () => void;
}) {
  const selectable = status !== "future";

  return (
    <button
      type="button"
      title={status === "holiday" ? holidayTitle : undefined}
      disabled={!selectable}
      onClick={onClick}
      className={cn(
        "aspect-square rounded-xl grid place-items-center text-sm font-medium border relative transition-all",
        selectable && "cursor-pointer hover:ring-2 hover:ring-primary/30",
        !selectable && "cursor-default",
        dimmed && "opacity-30",
        status === "present" && "bg-success/10 text-success border-success/20",
        status === "absent" && "bg-destructive/10 text-destructive border-destructive/20",
        status === "leave" && "bg-warning/15 text-warning-foreground border-warning/30",
        status === "holiday" && "bg-muted/50 text-muted-foreground border-border",
        status === "future" && "bg-muted/20 text-muted-foreground/50 border-dashed border-border",
        inRange && "ring-2 ring-primary/40 ring-offset-1 ring-offset-card",
        isRangeMiddle && "bg-primary/10 border-primary/25",
        (isRangeStart || isRangeEnd) && "bg-primary/15 border-primary/40 font-semibold",
        isToday && "ring-2 ring-primary ring-offset-2 ring-offset-card",
      )}
    >
      {day}
    </button>
  );
}

function LegendDot({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 capitalize", cls)}>
      {label}
    </span>
  );
}

export function AttendanceLogSection({
  entries,
}: {
  entries: { date: string; status: "present" | "absent" | "leave"; note: string }[];
}) {
  return (
    <SectionCard title="Recent log" className="mt-5">
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.date}
            className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
          >
            <div>
              <div className="font-medium">{entry.date}</div>
              <div className="text-xs text-muted-foreground">{entry.note}</div>
            </div>
            <StatusBadge status={entry.status} />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function StatusBadge({ status }: { status: "present" | "absent" | "leave" }) {
  const cls = {
    present: "bg-success/15 text-success border-success/30",
    absent: "bg-destructive/10 text-destructive border-destructive/30",
    leave: "bg-warning/15 text-warning-foreground border-warning/30",
  }[status];
  return (
    <Badge variant="outline" className={cn("capitalize text-[10px]", cls)}>
      {status}
    </Badge>
  );
}