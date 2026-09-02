import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { AttendanceSummaryMetrics } from "@/components/app/attendance/AttendanceSummaryMetrics";
import {
  DateRangePickerRow,
  syncCalendarMonthFromIso,
} from "@/components/app/attendance/AttendanceDatePicker";
import { Button, cn, Badge } from "@lumenx/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@lumenx/ui";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useApp } from "@/lib/app-state";
import { isInstituteUuid } from "@/lib/institute-id";
import { loadInstituteHolidays } from "@/lib/events";
import { loadLearnerAttendancePortal } from "@/lib/attendance/load";
import {
  monthIsoRange,
  overlayPortalAttendanceDays,
  portalDaysToStatusMap,
} from "@/lib/attendance/map";
import {
  buildAttendanceDays,
  buildLearnerAttendanceDays,
  computeAttendanceSummary,
  computeAttendanceSummaryForRange,
  attendanceHistoryBounds,
  calendarLeadingBlanks,
  formatDisplayDate,
  holidaysInMonth,
  holidaysInRange,
  isoFromParts,
  listSelectableMonths,
  monthLabel,
  normalizeIsoRange,
  shiftMonth,
} from "@/lib/attendance/calendar";
import type { AttendanceDay, AttendanceDayStatus, InstituteHoliday } from "@/lib/attendance/types";

type AttendanceOverviewProps = {
  title?: string;
  subtitle: string;
  /** @deprecated Ignored — Registers are the only attendance SoT. */
  seed?: number;
  studentId?: string;
  sectionKey?: string;
  /** Real student UUID for API portal history (parent/student Connect API mode). */
  portalStudentId?: string;
  /** Open calendar on this year (0-based month via initialMonth). Defaults to current month. */
  initialYear?: number;
  initialMonth?: number;
  maxYear?: number;
  maxMonth?: number;
};

export function AttendanceOverview({
  title = "Attendance",
  subtitle,
  studentId,
  sectionKey,
  portalStudentId,
  initialYear,
  initialMonth,
}: AttendanceOverviewProps) {
  const now = new Date();
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? now.getMonth());
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const { activeInstituteId } = useApp();
  const [apiHolidays, setApiHolidays] = useState<InstituteHoliday[] | null>(null);
  const [portalStatusByDate, setPortalStatusByDate] = useState<Map<
    string,
    AttendanceDayStatus
  > | null>(null);

  const apiPortalStudentId =
    portalStudentId && isInstituteUuid(portalStudentId) ? portalStudentId : null;

  useEffect(() => {
    if (!isApiAuthMode() || !apiPortalStudentId || !activeInstituteId) {
      setPortalStatusByDate(null);
      return;
    }
    let cancelled = false;
    const { from, to } = monthIsoRange(year, month);
    void loadLearnerAttendancePortal({
      instituteId: activeInstituteId,
      studentId: apiPortalStudentId,
      fromDate: from,
      toDate: to,
    }).then((result) => {
      if (cancelled) return;
      if (result.portal) {
        setPortalStatusByDate(portalDaysToStatusMap(result.portal));
      } else {
        setPortalStatusByDate(new Map());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, apiPortalStudentId, year, month]);

  useEffect(() => {
    if (!isApiAuthMode()) {
      setApiHolidays(null);
      return;
    }
    let cancelled = false;
    void loadInstituteHolidays({ instituteId: activeInstituteId }).then((items) => {
      if (cancelled) return;
      setApiHolidays(items.length > 0 ? items : []);
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId]);

  const holidayList = isApiAuthMode() && apiHolidays !== null ? apiHolidays : undefined;

  const historyBounds = useMemo(() => attendanceHistoryBounds(12), []);
  const days = useMemo(() => {
    if (apiPortalStudentId && portalStatusByDate) {
      return overlayPortalAttendanceDays(
        buildAttendanceDays(year, month, holidayList),
        { year, month, statusByDate: portalStatusByDate },
      );
    }
    if (studentId && sectionKey) {
      return buildLearnerAttendanceDays({
        year,
        month,
        studentId,
        sectionKey,
        holidays: holidayList,
      });
    }
    return buildAttendanceDays(year, month, holidayList);
  }, [
    year,
    month,
    studentId,
    sectionKey,
    holidayList,
    apiPortalStudentId,
    portalStatusByDate,
  ]);
  const leadingBlanks = calendarLeadingBlanks(year, month);
  const selectableMonths = useMemo(() => listSelectableMonths(12), []);

  const dayRange = useMemo(() => {
    if (!rangeStart || !rangeEnd) return undefined;
    return normalizeIsoRange(rangeStart, rangeEnd);
  }, [rangeStart, rangeEnd]);

  const summary = useMemo(() => {
    if (dayRange) {
      if (studentId && sectionKey) {
        const start = new Date(`${dayRange.startIso}T12:00:00`);
        const end = new Date(`${dayRange.endIso}T12:00:00`);
        const scoped: AttendanceDay[] = [];
        const cursor = new Date(start);
        while (cursor <= end) {
          const y = cursor.getFullYear();
          const m = cursor.getMonth();
          const day = cursor.getDate();
          const monthDays = buildLearnerAttendanceDays({
            year: y,
            month: m,
            studentId,
            sectionKey,
            holidays: holidayList,
          });
          const hit = monthDays.find((d) => d.day === day);
          if (hit) scoped.push(hit);
          cursor.setDate(cursor.getDate() + 1);
        }
        return computeAttendanceSummary(scoped, year, month, dayRange);
      }
      return computeAttendanceSummaryForRange(dayRange.startIso, dayRange.endIso, holidayList);
    }
    return computeAttendanceSummary(days, year, month);
  }, [dayRange, days, year, month, studentId, sectionKey, holidayList]);

  const monthHolidays = useMemo(() => {
    if (dayRange) {
      return holidaysInRange(dayRange.startIso, dayRange.endIso, holidayList).filter((h) =>
        h.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}-`),
      );
    }
    return holidaysInMonth(year, month, holidayList);
  }, [year, month, dayRange, holidayList]);

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

      <div className="mb-3 min-w-0">
        <DateRangePickerRow
          startLabel="From date"
          endLabel="To date"
          startValue={rangeStart}
          endValue={rangeEnd}
          onStartChange={setFromDate}
          onEndChange={setToDate}
          startMin={historyBounds.start}
          startMax={rangeEnd || historyBounds.end}
          endMin={rangeStart || historyBounds.start}
          endMax={historyBounds.end}
          startPlaceholder="Start date"
          endPlaceholder="End date"
          viewYear={year}
          viewMonth={month}
          trailing={
            rangeStart || rangeEnd ? (
              <Button
                type="button"
                variant="ghost"
                className="h-10 shrink-0 rounded-xl px-2 text-xs sm:px-3 sm:text-sm"
                onClick={clearRange}
              >
                Full month
              </Button>
            ) : undefined
          }
        />
      </div>

      {rangeStart ? (
        <p className="mb-3 text-xs text-muted-foreground">
          {summary.rangeLabel ? (
            <>
              Showing <span className="font-medium text-foreground">{summary.rangeLabel}</span>
            </>
          ) : (
            <span>Choose a To date to calculate attendance for the selected period.</span>
          )}
        </p>
      ) : null}

      <AttendanceSummaryMetrics summary={summary} />

      {/* Month navigation — arrows stay outside the month select so they never overlap */}
      <div className="mb-3 mt-4 flex min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-xl"
          onClick={goPrev}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <Select value={`${year}-${month}`} onValueChange={onMonthSelect}>
            <SelectTrigger className="h-10 w-full rounded-xl">
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
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-xl"
          onClick={goNext}
          disabled={!canGoNext}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 mb-4">
          <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4 shrink-0 text-primary" />
            <span>{summary.rangeLabel ?? summary.monthLabel}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <LegendDot label="Present" cls="bg-success/15 text-success border-success/20" />
            <LegendDot
              label="Absent"
              cls="bg-destructive/10 text-destructive border-destructive/20"
            />
            <LegendDot
              label="Leave"
              cls="bg-warning/15 text-warning-foreground border-warning/30"
            />
            <LegendDot label="Holiday" cls="bg-muted text-muted-foreground border-border" />
            {(dayRange || rangeStart) && (
              <LegendDot label="In range" cls="bg-primary/10 text-primary border-primary/30" />
            )}
          </div>
        </div>
        <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[10px] font-medium text-muted-foreground sm:gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="min-w-0">
              {d}
            </div>
          ))}
        </div>
        <div className="grid min-w-0 grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square min-w-0" aria-hidden />
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

      <SectionCard title="Holidays" className="mb-5">
        {monthHolidays.length > 0 ? (
          <div className="space-y-2">
            {monthHolidays.map((h) => (
              <div
                key={h.id}
                className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm">{h.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    {h.purpose}
                  </div>
                </div>
                <div className="shrink-0 text-xs font-medium text-primary whitespace-nowrap">
                  {formatDisplayDate(h.date)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No institute holidays this month.</p>
        )}
      </SectionCard>

      {!rangeStart ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Tip: tap two days on the calendar above to filter by a custom date range.
        </p>
      ) : null}
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
        "aspect-square min-w-0 rounded-xl grid place-items-center text-sm font-medium border relative transition-all",
        selectable && "cursor-pointer hover:ring-2 hover:ring-primary/30",
        !selectable && "cursor-default",
        dimmed && "opacity-30",
        status === "present" && "bg-success/10 text-success border-success/20",
        status === "absent" && "bg-destructive/10 text-destructive border-destructive/20",
        status === "leave" && "bg-warning/15 text-warning-foreground border-warning/30",
        status === "holiday" && "bg-muted/50 text-muted-foreground border-border",
        status === "future" && "bg-muted/20 text-muted-foreground/50 border-dashed border-border",
        status === "unknown" && "bg-muted/30 text-muted-foreground border-border/60",
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
    <span
      className={cn("inline-flex items-center rounded-full border px-2 py-0.5 capitalize", cls)}
    >
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
