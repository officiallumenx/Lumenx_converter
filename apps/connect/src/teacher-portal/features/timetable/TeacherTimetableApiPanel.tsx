import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { TimetableDayPicker } from "@/components/app/timetable/TimetableDayPicker";
import { PeriodTimeline, type PeriodRow } from "@/components/app/timetable/PeriodTimeline";
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import { loadTeacherTimetable } from "@/lib/timetable";
import {
  getCurrentAndNextPeriod,
  getDefaultTimetableDay,
  getTodayDayName,
} from "@/lib/student/timetable-utils";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { Badge, cn } from "@lumenx/ui";

export function TeacherTimetableApiPanel() {
  const { activeInstituteId } = useApp();
  const [status, setStatus] = useState<string>("loading");
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<
    Record<string, Array<{ time: string; subject: string; teacher: string }>>
  >({});
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    void loadTeacherTimetable({ instituteId: activeInstituteId }).then((result) => {
      if (cancelled) return;
      setSchedule(result.schedule);
      setWeekdays(result.weekdays);
      setStatus(result.status);
      setError(result.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, reloadKey]);

  const days = weekdays.length > 0 ? weekdays : Object.keys(schedule);
  const today = getTodayDayName();
  const [day, setDay] = useState(() => getDefaultTimetableDay(days.length ? days : ["Monday"]));

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
  const isToday = day === today && days.includes(today);
  const { current, next } = useMemo(
    () => (isToday ? getCurrentAndNextPeriod(dayPeriods) : { current: null, next: null }),
    [dayPeriods, isToday],
  );

  const dayPeriodRows: PeriodRow[] = useMemo(
    () =>
      dayPeriods.map((period) => ({
        time: period.time,
        subject: period.subject,
        subtitle: period.teacher !== "—" ? period.teacher : undefined,
        state:
          current?.subject === period.subject && current?.time === period.time
            ? "current"
            : next?.subject === period.subject && next?.time === period.time
              ? "next"
              : "default",
      })),
    [dayPeriods, current, next],
  );

  if (status === "loading") {
    return (
      <div className="min-w-0 space-y-5">
        <PageHeader title="Timetable" subtitle="Your teaching periods across assigned classes" />
        <PageSkeleton rows={4} />
      </div>
    );
  }

  if (status === "needs_institute") {
    return (
      <div className="min-w-0 space-y-5">
        <PageHeader title="Timetable" subtitle="Your teaching periods across assigned classes" />
        <p className="text-sm text-muted-foreground">Select an institute to view timetable.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-w-0 space-y-5">
        <PageHeader
          title="Timetable"
          subtitle="Your teaching periods across assigned classes"
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
        <p className="text-sm text-destructive">{error ?? "Failed to load timetable."}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader title="Timetable" subtitle="Your teaching periods across assigned classes" />

      <div className="flex gap-2">
        {(["daily", "weekly"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium capitalize",
              view === v
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-muted text-muted-foreground",
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "daily" ? (
        <>
          {isToday && (current || next) && (
            <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
              {current && (
                <div className="rounded-2xl border border-primary/40 bg-primary/[0.06] p-4">
                  <Badge className="mb-2 border-0 bg-primary text-primary-foreground">Now</Badge>
                  <div className="font-semibold text-primary">{current.subject}</div>
                  <div className="text-sm text-muted-foreground">{current.time}</div>
                </div>
              )}
              {next && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <Badge variant="outline" className="mb-2">
                    Up next
                  </Badge>
                  <div className="font-semibold text-primary">{next.subject}</div>
                  <div className="text-sm text-muted-foreground">{next.time}</div>
                </div>
              )}
            </div>
          )}

          <TimetableDayPicker
            days={days}
            selected={day}
            onSelect={setDay}
            todayName={today}
            periodCounts={periodCounts}
          />

          <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
            <header className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-border pb-4">
              <div>
                <h2 className="font-semibold">{day}</h2>
                <p className="text-xs text-muted-foreground">
                  {dayPeriods.length} period{dayPeriods.length === 1 ? "" : "s"}
                </p>
              </div>
              {isToday && current && (
                <Badge className="border-0 bg-primary text-primary-foreground">In session</Badge>
              )}
            </header>
            <PeriodTimeline
              periods={dayPeriodRows}
              emptyMessage={
                status === "empty" ? "No timetable published yet." : `No classes on ${day}.`
              }
              showPastMuted={isToday}
            />
          </section>
        </>
      ) : (
        <div className="space-y-6">
          {days.map((d) => {
            const slotsForDay = schedule[d] ?? [];
            if (!slotsForDay.length) return null;
            const rows: PeriodRow[] = slotsForDay.map((slot) => ({
              time: slot.time,
              subject: slot.subject,
              subtitle: slot.teacher !== "—" ? slot.teacher : undefined,
              state: "default",
            }));
            return (
              <section
                key={d}
                className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5"
              >
                <h2
                  className={cn(
                    "mb-4 border-b border-border pb-3 text-sm font-semibold",
                    d === today && "text-primary",
                  )}
                >
                  {d}
                  {d === today ? " (Today)" : ""}
                  <span className="ml-2 font-normal text-muted-foreground">
                    · {slotsForDay.length} periods
                  </span>
                </h2>
                <PeriodTimeline periods={rows} />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
