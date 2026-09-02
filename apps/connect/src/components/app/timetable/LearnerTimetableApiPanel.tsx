import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { TimetableDayPicker } from "@/components/app/timetable/TimetableDayPicker";
import { buildStudentPeriodRows, PeriodTimeline } from "@/components/app/timetable/PeriodTimeline";
import { useApp } from "@/lib/app-state";
import { loadLearnerTimetable } from "@/lib/timetable";
import {
  getCurrentAndNextPeriod,
  getDefaultTimetableDay,
  getTodayDayName,
  splitPeriodTime,
  subjectStyle,
} from "@/lib/student/timetable-utils";
import { Badge, cn } from "@lumenx/ui";
import { Clock, User } from "lucide-react";

type LearnerTimetableApiPanelProps = {
  studentId: string;
  subtitle: string;
};

export function LearnerTimetableApiPanel({ studentId, subtitle }: LearnerTimetableApiPanelProps) {
  const { activeInstituteId } = useApp();
  const [status, setStatus] = useState<string>("loading");
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<
    Record<string, Array<{ time: string; subject: string; teacher: string }>>
  >({});
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    void loadLearnerTimetable({ instituteId: activeInstituteId, studentId }).then((result) => {
      if (cancelled) return;
      setSchedule(result.schedule);
      setWeekdays(result.weekdays);
      setStatus(result.status);
      setError(result.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, studentId, reloadKey]);

  const days = weekdays.length > 0 ? weekdays : Object.keys(schedule);
  const todayName = getTodayDayName();
  const [day, setDay] = useState(() => getDefaultTimetableDay(days.length ? days : ["Monday"]));
  const isToday = day === todayName && days.includes(todayName);

  useEffect(() => {
    if (days.length > 0) {
      setDay((current) => (days.includes(current) ? current : getDefaultTimetableDay(days)));
    }
  }, [days]);

  const periodCounts = useMemo(
    () =>
      Object.fromEntries(days.map((d) => [d, (schedule[d] ?? []).length])) as Record<string, number>,
    [days, schedule],
  );

  const dayPeriods = schedule[day] ?? [];

  const { current, next } = useMemo(
    () => (isToday ? getCurrentAndNextPeriod(dayPeriods) : { current: null, next: null }),
    [dayPeriods, isToday],
  );

  const periodRows = useMemo(
    () => buildStudentPeriodRows(dayPeriods, { isToday, current, next }),
    [dayPeriods, isToday, current, next],
  );

  if (status === "loading") {
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <PageHeader title="Timetable" subtitle={subtitle} />
        <p className="text-sm text-muted-foreground px-1">Loading timetable…</p>
      </div>
    );
  }

  if (status === "needs_institute") {
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <PageHeader title="Timetable" subtitle={subtitle} />
        <p className="text-sm text-muted-foreground px-1">Select an institute to view timetable.</p>
      </div>
    );
  }

  if (status === "forbidden" || status === "error") {
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <PageHeader
          title="Timetable"
          subtitle={subtitle}
          action={
            <button
              type="button"
              className="text-sm text-primary underline"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Retry
            </button>
          }
        />
        <p className="text-sm text-destructive px-1">{error ?? "Failed to load timetable."}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader title="Timetable" subtitle={subtitle} />

      <TimetableDayPicker
        days={days}
        selected={day}
        onSelect={setDay}
        todayName={todayName}
        periodCounts={periodCounts}
      />

      {isToday && (current || next) && (
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          {current && <NowNextHighlight period={current} variant="now" />}
          {next && <NowNextHighlight period={next} variant="next" />}
        </div>
      )}

      {isToday && !current && !next && dayPeriods.length > 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-4 text-center text-sm text-muted-foreground">
          No more classes scheduled for today.
        </div>
      )}

      <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-border pb-4">
          <div>
            <h2 className="font-semibold text-primary">{day}</h2>
            <p className="text-xs text-muted-foreground">
              {dayPeriods.length} period{dayPeriods.length === 1 ? "" : "s"}
              {isToday ? " · Today’s schedule" : ""}
            </p>
          </div>
          {isToday && current && (
            <Badge className="border-0 bg-primary text-white">In session</Badge>
          )}
        </header>

        <PeriodTimeline
          periods={periodRows}
          emptyMessage={
            status === "empty" ? "No timetable published yet." : `No classes on ${day}.`
          }
          showPastMuted={isToday}
        />
      </section>
    </div>
  );
}

function NowNextHighlight({
  period,
  variant,
}: {
  period: { time: string; subject: string; teacher: string };
  variant: "now" | "next";
}) {
  const { start, end } = splitPeriodTime(period.time);
  const isNow = variant === "now";
  const style = subjectStyle(period.subject);

  return (
    <div
      className="relative min-w-0 overflow-hidden rounded-2xl border p-4 text-foreground shadow-soft sm:p-5"
      style={{
        backgroundColor: style.surface,
        borderColor: isNow ? style.primary : style.border,
        boxShadow: isNow ? `0 8px 20px -10px ${style.primary}55` : undefined,
      }}
    >
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: style.primary }}
        aria-hidden
      />
      <div className="pl-3">
        <Badge
          className={cn("mb-3", isNow ? "border-0 text-white" : "")}
          variant={isNow ? "default" : "outline"}
          style={
            isNow
              ? { backgroundColor: style.primary }
              : {
                  color: style.primary,
                  borderColor: `${style.primary}55`,
                  backgroundColor: style.chipBg,
                }
          }
        >
          {isNow ? "Now" : "Up next"}
        </Badge>
        <div
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
          style={{
            color: style.primary,
            backgroundColor: style.chipBg,
            borderColor: `${style.primary}33`,
          }}
        >
          {period.subject}
        </div>
        <div className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 tabular-nums text-foreground">
            <Clock className="size-3.5 shrink-0" style={{ color: style.primary }} />
            <span className="sm:hidden">
              {start}
              {end ? ` – ${end}` : ""}
            </span>
            <span className="hidden sm:inline">{period.time}</span>
          </span>
          {period.teacher !== "—" && (
            <span className="inline-flex items-center gap-1.5">
              <User className="size-3.5 shrink-0" style={{ color: style.primary }} />
              {period.teacher}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
