import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { days, studentTimetable, teacherTimetable } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/timetable")({
  head: () => ({ meta: [{ title: "Timetable — Unify" }] }),
  component: () => (
    <AppShell>
      <TimetablePage />
    </AppShell>
  ),
});

type TimetablePeriod =
  | { time: string; subject: string; teacher: string }
  | { time: string; subject: string; class: string };

function TimetablePage() {
  const { role } = useApp();
  const portal = useParentPortal();
  const snap = role === "parent" && portal.isParent ? portal.snapshot : null;
  const data = useMemo(() => {
    if (snap) return snap.timetable;
    return role === "teacher" ? teacherTimetable : studentTimetable;
  }, [role, snap]);
  const [day, setDay] = useState(days[Math.max(0, Math.min(5, new Date().getDay() - 1))]);

  const subtitle = snap
    ? `${snap.child.name} · ${snap.classTag}`
    : "Your weekly schedule at a glance";

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader title="Timetable" subtitle={subtitle} />

      <div className="mb-4 flex min-w-0 gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              day === d
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="px-5 py-4 border-b border-border bg-muted/30">
          <div className="font-semibold">{day}</div>
          <div className="text-xs text-muted-foreground">{data[day]?.length ?? 0} periods</div>
        </div>
        <ul className="divide-y divide-border">
          {(data[day] ?? []).map((p: TimetablePeriod, i: number) => (
            <li key={i} className="flex min-w-0 items-center gap-2 p-4 sm:gap-4">
              <div className="w-[4.25rem] shrink-0 text-xs font-medium tabular-nums text-muted-foreground sm:w-24">
                <span className="block truncate">{p.time}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{p.subject}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {"class" in p ? `Class ${p.class}` : p.teacher}
                </div>
              </div>
              <div className="size-2 rounded-full bg-primary" />
            </li>
          ))}
          {!data[day]?.length && (
            <li className="p-8 text-center text-sm text-muted-foreground">No classes scheduled.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
