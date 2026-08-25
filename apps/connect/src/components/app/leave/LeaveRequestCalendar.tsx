import { useMemo } from "react";
import { Button, cn } from "@lumenx/ui";
import type { LeaveRequest } from "@lumenx/types";
import {
  calendarLeadingBlanks,
  isoFromParts,
  monthLabel,
  shiftMonth,
} from "@/lib/attendance/calendar";
import {
  connectMonthDayBase,
  connectMonthDayMarked,
  connectMonthDayMuted,
  connectMonthDaySelected,
  connectMonthDayToday,
} from "@/lib/connect-calendar-theme";
import { ChevronLeft, ChevronRight } from "lucide-react";

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

export function LeaveRequestCalendar({
  year,
  month,
  onMonthChange,
  requests,
  rangeStart,
  rangeEnd,
  minDate,
  interactive = false,
  onRangeSelect,
}: {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  requests: LeaveRequest[];
  rangeStart?: string;
  rangeEnd?: string;
  minDate?: string;
  interactive?: boolean;
  onRangeSelect?: (start: string, end: string) => void;
}) {
  const leading = calendarLeadingBlanks(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const leaveDays = useMemo(() => {
    const set = new Set<string>();
    for (const req of requests) {
      if (req.status === "rejected" || req.status === "dismissed") continue;
      let cur = req.leaveStartDate;
      while (cur <= req.leaveEndDate) {
        set.add(cur);
        const d = parseIso(cur);
        const next = new Date(d.year, d.month, d.day + 1);
        cur = isoFromParts(next.getFullYear(), next.getMonth(), next.getDate());
      }
    }
    return set;
  }, [requests]);

  const goPrev = () => {
    const n = shiftMonth(year, month, -1);
    onMonthChange(n.year, n.month);
  };

  const goNext = () => {
    const n = shiftMonth(year, month, 1);
    onMonthChange(n.year, n.month);
  };

  const handleDaySelect = (iso: string) => {
    if (!interactive || !onRangeSelect || (minDate && iso < minDate)) return;

    if (!rangeStart || (rangeStart && rangeEnd)) {
      onRangeSelect(iso, iso);
      return;
    }

    if (iso < rangeStart) {
      onRangeSelect(iso, iso);
      return;
    }

    onRangeSelect(rangeStart, iso);
  };

  const rangeLabel =
    rangeStart && rangeEnd && rangeStart !== rangeEnd
      ? `${rangeStart} → ${rangeEnd}`
      : rangeStart
        ? rangeStart
        : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={goPrev} aria-label="Previous month">
          <ChevronLeft className="size-4" />
        </Button>
        <div className="text-center">
          <div className="font-display font-semibold">{monthLabel(year, month)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {interactive
              ? rangeLabel
                ? `Selected: ${rangeLabel}`
                : "Tap start and end dates for leave"
              : "Your leave requests on the calendar"}
          </div>
        </div>
        <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={goNext} aria-label="Next month">
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[10px] font-medium text-muted-foreground">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={`${d}-${i}`} className="min-w-0">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square min-w-0" aria-hidden />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const iso = isoFromParts(year, month, day);
          const isPastBlocked = minDate ? iso < minDate : false;
          const inDraftRange =
            rangeStart &&
            (rangeEnd ? iso >= rangeStart && iso <= rangeEnd : iso === rangeStart);
          const onApprovedLeave = leaveDays.has(iso);
          const isToday = isCurrentMonth && day === today.getDate();
          const selectable = interactive && !isPastBlocked;

          const cellClass = cn(
            connectMonthDayBase,
            isPastBlocked && connectMonthDayMuted,
            !isPastBlocked && !inDraftRange && !onApprovedLeave && "hover:bg-primary/[0.04]",
            onApprovedLeave && connectMonthDayMarked,
            inDraftRange && connectMonthDaySelected,
            isToday && !inDraftRange && connectMonthDayToday,
            selectable && "cursor-pointer hover:ring-2 hover:ring-primary/30 active:scale-95",
          );

          if (selectable) {
            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDaySelect(iso)}
                className={cellClass}
              >
                {day}
              </button>
            );
          }

          return (
            <div key={day} className={cellClass}>
              {day}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
          Selected range
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-primary">
          Approved / pending leave
        </span>
      </div>
    </div>
  );
}
