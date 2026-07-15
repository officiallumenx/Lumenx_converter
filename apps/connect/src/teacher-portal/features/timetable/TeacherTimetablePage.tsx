import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { TimetableDayPicker } from "@/components/app/timetable/TimetableDayPicker";
import { PeriodTimeline, type PeriodRow } from "@/components/app/timetable/PeriodTimeline";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import {
  DAYS,
  getDefaultTeacherDay,
  getTodayDayName,
  teacherRepository,
} from "@/lib/teacher/repositories";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  Badge,
} from "@lumenx/ui";
import type { TimetableSlot } from "@/lib/teacher/types";

function parseStart(time: string): number {
  const m = time.match(/(\d+):(\d+)/);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (time.toLowerCase().includes("pm") && h < 12) h += 12;
  if (time.toLowerCase().includes("am") && h === 12) h = 0;
  return h * 60 + min;
}

export function TeacherTimetablePage() {
  const portal = useTeacherPortal();
  const [mode, setMode] = useState<"my" | "class">("my");
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [day, setDay] = useState(getDefaultTeacherDay());
  const initialClass = portal.classes[0];
  const [classNameFilter, setClassNameFilter] = useState(initialClass?.className ?? "");
  const [sectionFilter, setSectionFilter] = useState(initialClass?.section ?? "");
  const [daySlots, setDaySlots] = useState<TimetableSlot[]>([]);
  const [weekSlots, setWeekSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const classNames = useMemo(
    () => [...new Set(portal.classes.map((c) => c.className))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [portal.classes],
  );

  const sections = useMemo(
    () =>
      [
        ...new Set(
          portal.classes.filter((c) => c.className === classNameFilter).map((c) => c.section),
        ),
      ].sort(),
    [portal.classes, classNameFilter],
  );

  const classId = useMemo(() => {
    const match = portal.classes.find(
      (c) => c.className === classNameFilter && c.section === sectionFilter,
    );
    return match?.id ?? "";
  }, [portal.classes, classNameFilter, sectionFilter]);

  useEffect(() => {
    if (portal.isTeacher && portal.classes[0] && !classNameFilter) {
      setClassNameFilter(portal.classes[0].className);
      setSectionFilter(portal.classes[0].section);
    }
  }, [portal, classNameFilter]);

  useEffect(() => {
    if (!sections.includes(sectionFilter) && sections[0]) {
      setSectionFilter(sections[0]);
    }
  }, [sections, sectionFilter]);

  const teacherSubjects = portal.profile?.subjects ?? ["Mathematics"];

  useEffect(() => {
    setLoading(true);
    if (mode === "class" && classId) {
      Promise.all([
        teacherRepository.getClassTimetableForDay(classId, day),
        teacherRepository.getClassTimetable(classId),
      ]).then(([d, all]) => {
        setDaySlots(d);
        setWeekSlots(all);
        setLoading(false);
      });
    } else {
      Promise.all([
        teacherRepository.getTimetableForDay(day),
        teacherRepository.getTimetable(),
      ]).then(([d, all]) => {
        setDaySlots(d);
        setWeekSlots(all);
        setLoading(false);
      });
    }
  }, [day, mode, classId]);

  const today = getTodayDayName();
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();

  const periodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of DAYS) {
      counts[d] = weekSlots.filter((s) => s.day === d).length;
    }
    return counts;
  }, [weekSlots]);

  const withHighlight = (list: TimetableSlot[]) => {
    if (day !== today)
      return list.map((s) => ({ slot: s, current: false, next: false, past: false }));
    const sorted = [...list].sort((a, b) => parseStart(a.time) - parseStart(b.time));
    let currentIdx = -1;
    for (let i = 0; i < sorted.length; i++) {
      const start = parseStart(sorted[i].time);
      const end = start + 45;
      if (nowMins >= start && nowMins < end) currentIdx = i;
    }
    const nextIdx =
      currentIdx >= 0 ? currentIdx + 1 : sorted.findIndex((s) => parseStart(s.time) > nowMins);
    return sorted.map((s, i) => ({
      slot: s,
      current: i === currentIdx,
      next: i === nextIdx && (currentIdx >= 0 || nextIdx === i),
      past: i < currentIdx || (currentIdx < 0 && parseStart(s.time) + 45 <= nowMins),
    }));
  };

  const highlightedDay = useMemo(() => withHighlight(daySlots), [daySlots, day, today, nowMins]);

  const isTeacherPeriod = (slot: TimetableSlot) => teacherSubjects.includes(slot.subject);

  const dayPeriodRows: PeriodRow[] = useMemo(
    () =>
      highlightedDay.map(({ slot, current, next, past }) => ({
        time: slot.time,
        subject: slot.subject,
        subtitle: `Class ${slot.className}-${slot.section}${slot.room ? ` · Room ${slot.room}` : ""}`,
        badge:
          current || next
            ? undefined
            : mode === "class" && isTeacherPeriod(slot)
              ? "Your class"
              : undefined,
        state: current ? "current" : next ? "next" : past ? "past" : "default",
      })),
    [highlightedDay, mode, teacherSubjects],
  );

  if (!portal.isTeacher) return null;

  const currentSlot = highlightedDay.find((h) => h.current)?.slot;
  const nextSlot = highlightedDay.find((h) => h.next)?.slot;

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
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium",
              mode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
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
            onValueChange={(v) => {
              setClassNameFilter(v);
              const nextSections = portal.classes
                .filter((c) => c.className === v)
                .map((c) => c.section);
              if (!nextSections.includes(sectionFilter)) {
                setSectionFilter(nextSections[0] ?? "");
              }
            }}
          >
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[100]">
              {classNames.map((c) => (
                <SelectItem key={c} value={c}>
                  Class {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="Section" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[100]">
              {sections.map((s) => (
                <SelectItem key={s} value={s}>
                  Section {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
          {day === today && (currentSlot || nextSlot) && (
            <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
              {currentSlot && <TeacherHighlight slot={currentSlot} label="Now" showMarkLink />}
              {nextSlot && <TeacherHighlight slot={nextSlot} label="Up next" />}
            </div>
          )}

          <TimetableDayPicker
            days={DAYS}
            selected={day}
            onSelect={setDay}
            todayName={today}
            periodCounts={periodCounts}
          />

          {loading ? (
            <PageSkeleton rows={4} />
          ) : (
            <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
              <header className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-border pb-4">
                <div>
                  <h2 className="font-semibold">{day}</h2>
                  <p className="text-xs text-muted-foreground">
                    {daySlots.length} period{daySlots.length === 1 ? "" : "s"}
                  </p>
                </div>
                {currentSlot && (
                  <Badge className="border-0 bg-primary text-primary-foreground">In session</Badge>
                )}
              </header>
              <PeriodTimeline
                periods={dayPeriodRows}
                emptyMessage={`No classes on ${day}.`}
                showPastMuted={day === today}
              />
            </section>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {loading ? (
            <PageSkeleton rows={6} />
          ) : (
            DAYS.map((d) => {
              const slotsForDay = weekSlots.filter((s) => s.day === d);
              if (!slotsForDay.length) return null;
              const rows: PeriodRow[] = slotsForDay.map((slot) => ({
                time: slot.time,
                subject: slot.subject,
                subtitle: `Class ${slot.className}-${slot.section}${slot.room ? ` · Room ${slot.room}` : ""}`,
                badge: mode === "class" && isTeacherPeriod(slot) ? "Your class" : undefined,
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
            })
          )}
        </div>
      )}
    </div>
  );
}

function TeacherHighlight({
  slot,
  label,
  showMarkLink,
}: {
  slot: TimetableSlot;
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
      <div className="font-semibold">{slot.subject}</div>
      <div className="mt-1 text-sm text-muted-foreground">{slot.time}</div>
      <div className="text-xs text-muted-foreground">
        Class {slot.className}-{slot.section}
        {slot.room ? ` · Room ${slot.room}` : ""}
      </div>
      {showMarkLink && isNow && (
        <Link
          to="/attendance"
          className="mt-3 inline-flex rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          Mark attendance
        </Link>
      )}
    </div>
  );
}
