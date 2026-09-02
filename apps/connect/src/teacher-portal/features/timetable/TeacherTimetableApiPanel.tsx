import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { TimetableDayPicker } from "@/components/app/timetable/TimetableDayPicker";
import { PeriodTimeline, type PeriodRow } from "@/components/app/timetable/PeriodTimeline";
import { useApp } from "@/lib/app-state";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { loadTeacherTimetable } from "@/lib/timetable";
import {
  getCurrentAndNextPeriod,
  getDefaultTimetableDay,
  getTodayDayName,
} from "@/lib/student/timetable-utils";
import { sectionsForClassName, uniqueSortedClassNames } from "@/lib/class-section-options";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  cn,
} from "@lumenx/ui";
import type { WeeklyTimetable } from "@/lib/timetable";

type TimetablePeriod = WeeklyTimetable[string][number];

export function TeacherTimetableApiPanel() {
  const { activeInstituteId } = useApp();
  const portal = useTeacherPortal();
  const [mode, setMode] = useState<"my" | "class">("my");
  const [status, setStatus] = useState<string>("loading");
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<WeeklyTimetable>({});
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [reloadKey, setReloadKey] = useState(0);

  const initialClass = portal.classes[0];
  const [classNameFilter, setClassNameFilter] = useState(initialClass?.className ?? "");
  const [sectionFilter, setSectionFilter] = useState(initialClass?.section ?? "");

  const classNames = useMemo(
    () => uniqueSortedClassNames(portal.classes),
    [portal.classes],
  );
  const sections = useMemo(
    () => sectionsForClassName(portal.classes, classNameFilter),
    [portal.classes, classNameFilter],
  );
  const sectionId = useMemo(() => {
    const match = portal.classes.find(
      (item) => item.className === classNameFilter && item.section === sectionFilter,
    );
    return match?.id ?? "";
  }, [portal.classes, classNameFilter, sectionFilter]);

  useEffect(() => {
    if (portal.classes[0] && !classNameFilter) {
      setClassNameFilter(portal.classes[0].className);
      setSectionFilter(portal.classes[0].section);
    }
  }, [portal.classes, classNameFilter]);

  useEffect(() => {
    if (!sections.includes(sectionFilter) && sections[0]) {
      setSectionFilter(sections[0]);
    }
  }, [sections, sectionFilter]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    void loadTeacherTimetable({
      instituteId: activeInstituteId,
      sectionId: mode === "class" ? sectionId || null : null,
    }).then((result) => {
      if (cancelled) return;
      setSchedule(result.schedule);
      setWeekdays(result.weekdays);
      setStatus(result.status);
      setError(result.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, reloadKey, mode, sectionId]);

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
        subject: mode === "class" ? period.subject : period.subject,
        subtitle:
          mode === "class"
            ? period.teacher !== "—"
              ? period.teacher
              : undefined
            : period.teacher !== "—"
              ? period.teacher
              : undefined,
        state:
          current?.subject === period.subject && current?.time === period.time
            ? "current"
            : next?.subject === period.subject && next?.time === period.time
              ? "next"
              : "default",
      })),
    [dayPeriods, current, next, mode],
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
      <PageHeader
        title="Timetable"
        subtitle={
          mode === "class"
            ? "Full class schedule — all subjects for the selected class"
            : "Your teaching periods across assigned classes"
        }
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["my", "My timetable"],
            ["class", "Class timetable"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium",
              mode === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "class" && (
        <div className="grid grid-cols-2 gap-2 sm:max-w-md sm:gap-3">
          <Select
            value={classNameFilter}
            onValueChange={(value) => {
              setClassNameFilter(value);
              const nextSections = portal.classes
                .filter((item) => item.className === value)
                .map((item) => item.section);
              if (!nextSections.includes(sectionFilter)) {
                setSectionFilter(nextSections[0] ?? "");
              }
            }}
          >
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[100]">
              {classNames.map((name) => (
                <SelectItem key={name} value={name}>
                  Class {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[100]">
              {sections.map((section) => (
                <SelectItem key={section} value={section}>
                  Section {section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2">
        {(["daily", "weekly"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setView(value)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium capitalize",
              view === value
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-muted text-muted-foreground",
            )}
          >
            {value}
          </button>
        ))}
      </div>

      {view === "daily" ? (
        <>
          {isToday && (current || next) && (
            <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
              {current && (
                <TeacherHighlight period={current} label="Now" showMarkLink={mode === "my"} />
              )}
              {next && <TeacherHighlight period={next} label="Up next" />}
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
                status === "empty"
                  ? "No timetable published yet."
                  : `No classes on ${day}.`
              }
              showPastMuted={isToday}
            />
          </section>
        </>
      ) : (
        <div className="space-y-6">
          {days.map((weekday) => {
            const slotsForDay = schedule[weekday] ?? [];
            if (!slotsForDay.length) return null;
            const rows: PeriodRow[] = slotsForDay.map((slot) => ({
              time: slot.time,
              subject: slot.subject,
              subtitle: slot.teacher !== "—" ? slot.teacher : undefined,
              state: "default",
            }));
            return (
              <section
                key={weekday}
                className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5"
              >
                <h2
                  className={cn(
                    "mb-4 border-b border-border pb-3 text-sm font-semibold",
                    weekday === today && "text-primary",
                  )}
                >
                  {weekday}
                  {weekday === today ? " (Today)" : ""}
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

function TeacherHighlight({
  period,
  label,
  showMarkLink,
}: {
  period: TimetablePeriod;
  label: string;
  showMarkLink?: boolean;
}) {
  const isNow = label === "Now";
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-soft sm:p-5",
        isNow ? "border-primary/40 bg-primary/[0.06]" : "border-border bg-card",
      )}
    >
      <Badge
        className={cn("mb-2", isNow && "border-0 bg-primary text-primary-foreground")}
        variant={isNow ? "default" : "outline"}
      >
        {label}
      </Badge>
      <div className="font-semibold text-primary">{period.subject}</div>
      <div className="mt-1 text-sm text-muted-foreground">{period.time}</div>
      {period.teacher !== "—" ? (
        <div className="text-xs text-muted-foreground">{period.teacher}</div>
      ) : null}
      {showMarkLink && isNow ? (
        <Link
          to="/attendance"
          className="mt-3 inline-flex rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          Mark attendance
        </Link>
      ) : null}
    </div>
  );
}
