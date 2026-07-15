import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { TimetableDayPicker } from "@/components/app/timetable/TimetableDayPicker";
import { buildStudentPeriodRows, PeriodTimeline } from "@/components/app/timetable/PeriodTimeline";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { days, studentTimetable } from "@/lib/mock-data";
import {
  getCurrentAndNextPeriod,
  getDefaultTimetableDay,
  getTodayDayName,
  splitPeriodTime,
} from "@/lib/student/timetable-utils";
import { TeacherTimetablePage } from "@/teacher-portal";
import { Badge, cn } from "@lumenx/ui";
import { Clock, User } from "lucide-react";

export const Route = createFileRoute("/timetable")({
  head: () => ({ meta: [{ title: "Timetable — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <TimetablePage />
    </AppShell>
  ),
});

function TimetablePage() {
  const { role } = useApp();
  const parentPortal = useParentPortal();
  const studentPortal = useStudentPortal();

  const parentSnap = role === "parent" && parentPortal.isParent ? parentPortal.snapshot : null;
  const studentSnap = role === "student" && studentPortal.isStudent ? studentPortal.snapshot : null;

  const data = useMemo(() => {
    if (parentSnap) return parentSnap.timetable;
    if (studentSnap) return studentSnap.timetable;
    return studentTimetable;
  }, [parentSnap, studentSnap]);

  const todayName = getTodayDayName();
  const [day, setDay] = useState(() => getDefaultTimetableDay(days));
  // Only "today" when the real weekday is an actual school day (avoids flagging Monday as
  // today on a Sunday, when there are no classes).
  const isToday = day === todayName && days.includes(todayName);

  const periodCounts = useMemo(
    () =>
      Object.fromEntries(days.map((d) => [d, (data[d] ?? []).length])) as Record<string, number>,
    [data],
  );

  const dayPeriods = (data[day] ?? []) as { time: string; subject: string; teacher: string }[];

  const { current, next } = useMemo(
    () => (isToday ? getCurrentAndNextPeriod(dayPeriods) : { current: null, next: null }),
    [dayPeriods, isToday],
  );

  const periodRows = useMemo(
    () => buildStudentPeriodRows(dayPeriods, { isToday, current, next }),
    [dayPeriods, isToday, current, next],
  );

  if (role === "teacher") return <TeacherTimetablePage />;

  const subtitle = parentSnap
    ? `${parentSnap.child.name} · ${parentSnap.classTag}`
    : studentSnap
      ? `${studentSnap.profile.name} · ${studentSnap.profile.class} ${studentSnap.profile.section}`
      : "Your weekly schedule at a glance";

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
          emptyMessage={`No classes on ${day}.`}
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

  return (
    <div
      className={cn(
        "relative min-w-0 overflow-hidden rounded-2xl border p-4 shadow-soft sm:p-5",
        isNow ? "border-primary/40 bg-primary/[0.06]" : "border-primary/20 bg-white dark:bg-card",
      )}
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />
      <div className="pl-3">
        <Badge
          className={cn(
            "mb-3",
            isNow ? "border-0 bg-primary text-white" : "border-primary/30 text-primary bg-primary/5",
          )}
          variant={isNow ? "default" : "outline"}
        >
          {isNow ? "Now" : "Up next"}
        </Badge>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
          {period.subject}
        </div>
        <div className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 tabular-nums text-foreground">
            <Clock className="size-3.5 shrink-0 text-primary" />
            <span className="sm:hidden">
              {start}
              {end ? ` – ${end}` : ""}
            </span>
            <span className="hidden sm:inline">{period.time}</span>
          </span>
          {period.teacher !== "—" && (
            <span className="inline-flex items-center gap-1.5">
              <User className="size-3.5 shrink-0 text-primary" />
              {period.teacher}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
