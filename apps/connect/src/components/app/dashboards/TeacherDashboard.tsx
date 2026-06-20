import { Link } from "@tanstack/react-router";
import {
  ClipboardCheck,
  BookOpen,
  Users,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { StatCard } from "../StatCard";
import {
  assignments,
  days,
  notifications,
  performance,
  teacherTimetable,
  classAchievements,
} from "@/lib/mock-data";
import { Button } from "@lumenx/ui";
import { Badge } from "@lumenx/ui";

export function TeacherDashboard() {
  const today = days[Math.max(0, Math.min(5, new Date().getDay() - 1))];
  const todayClasses = teacherTimetable[today] ?? [];
  const weak = [...performance].sort((a, b) => a.score - b.score).slice(0, 3);

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-glow md:p-8 min-w-0 max-w-full">
        <div className="text-xs uppercase tracking-widest opacity-80">Good morning</div>
        <h2 className="font-display mt-1 text-xl font-semibold sm:text-2xl md:text-3xl">
          You have {todayClasses.length} classes today.
        </h2>
        <p className="mt-2 max-w-lg text-xs opacity-85 sm:text-sm">
          One tap to mark attendance, review pending submissions, and stay ahead of the day.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link to="/attendance">
            <Button className="bg-white text-primary hover:bg-white/90 rounded-xl">
              Mark attendance
            </Button>
          </Link>
          <Link to="/assignments">
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20 rounded-xl"
            >
              Open assignments
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid min-w-0 auto-rows-fr grid-cols-2 items-stretch gap-2.5 sm:gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          icon={ClipboardCheck}
          label="Today's classes"
          value={String(todayClasses.length)}
          tone="primary"
        />
        <StatCard icon={Users} label="Students" value="124" hint="Across 4 sections" />
        <StatCard icon={BookOpen} label="To grade" value="18" tone="warning" hint="3 due soon" />
        <StatCard
          icon={AlertTriangle}
          label="Need attention"
          value="6"
          tone="warning"
          hint="Below 60%"
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 items-stretch lg:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col h-full sm:p-5 lg:col-span-2">
          <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
            <h3 className="min-w-0 truncate font-semibold">Today, {today}</h3>
            <Link
              to="/timetable"
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-primary hover:underline"
            >
              Timetable <ArrowRight className="size-3 shrink-0" />
            </Link>
          </div>
          <div className="divide-y divide-border flex-1 min-w-0">
            {todayClasses.map((c, i) => (
              <Link
                key={i}
                to="/attendance"
                className="flex min-w-0 items-center gap-2 py-3 first:pt-0 hover:bg-muted/30 sm:gap-3 md:gap-4 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="w-[4.25rem] shrink-0 text-xs font-medium tabular-nums text-muted-foreground sm:w-24">
                  <span className="block truncate">{c.time}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.subject}</div>
                  <div className="truncate text-xs text-muted-foreground">Class {c.class}</div>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs">
                  Pending
                </Badge>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            ))}
            {!todayClasses.length && (
              <div className="text-sm text-muted-foreground py-4">No classes today.</div>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col h-full sm:p-5">
          <h3 className="mb-3 font-semibold">Students needing attention</h3>
          <div className="min-w-0 flex-1 space-y-3">
            {weak.map((s) => (
              <div
                key={s.subject}
                className="flex min-w-0 items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 truncate">{s.subject} avg</span>
                <Badge
                  variant="outline"
                  className={`shrink-0 tabular-nums ${s.score < 70 ? "border-warning bg-warning/10 text-warning-foreground" : ""}`}
                >
                  {s.score}%
                </Badge>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">
              Consider remedial sessions for the bottom 6 students.
            </p>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 items-stretch lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col h-full sm:p-5">
          <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
            <h3 className="min-w-0 truncate font-semibold">Open assignments</h3>
            <Link
              to="/assignments"
              className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
            >
              View all <ArrowRight className="size-3 shrink-0" />
            </Link>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {assignments.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-border p-3 sm:gap-3"
              >
                <div className="size-9 shrink-0 rounded-lg bg-primary/10 text-primary grid place-items-center">
                  <BookOpen className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{a.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.class} • Due {a.due}
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px] capitalize sm:text-xs">
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col h-full sm:p-5">
          <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
            <h3 className="min-w-0 truncate font-semibold">Notifications</h3>
            <Link
              to="/notifications"
              className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
            >
              View all <ArrowRight className="size-3 shrink-0" />
            </Link>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {notifications.teacher.map((n) => (
              <div
                key={n.id}
                className="flex min-w-0 items-start gap-2 rounded-xl border border-border p-3 sm:gap-3"
              >
                <div
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${n.type === "warning" ? "bg-warning" : "bg-primary"}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{n.title}</div>
                  <div className="text-xs leading-snug text-muted-foreground line-clamp-2 break-words">
                    {n.desc}
                  </div>
                </div>
                <div className="max-w-[4.25rem] shrink-0 self-start text-right text-[10px] leading-tight text-muted-foreground sm:max-w-[5rem] sm:text-[11px]">
                  {n.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 items-stretch lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col h-full sm:p-5">
          <div className="mb-3 flex min-w-0 items-center gap-2">
            <TrendingUp className="size-4 shrink-0 text-success" />
            <h3 className="min-w-0 font-semibold leading-snug">Improving students</h3>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {[
              { name: "Aarav Sharma", note: "Math +12 this term", tone: "success" as const },
              {
                name: "Diya Nair",
                note: "Physics +9, on assignment streak",
                tone: "success" as const,
              },
              { name: "Kabir Khan", note: "Attendance back to 95%", tone: "success" as const },
            ].map((s, i) => (
              <div
                key={i}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-border p-3 sm:gap-3"
              >
                <div className="size-9 shrink-0 rounded-lg bg-success/15 text-success grid place-items-center">
                  <Sparkles className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{s.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{s.note}</div>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 border-success/30 text-[10px] text-success sm:text-xs"
                >
                  Improving
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col h-full sm:p-5">
          <h3 className="mb-3 font-semibold">Class achievements</h3>
          <div className="min-w-0 flex-1 space-y-2">
            {classAchievements.map((c) => (
              <div
                key={c.id}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-border p-3 sm:gap-3"
              >
                <div className="size-9 shrink-0 rounded-lg bg-primary/10 text-center text-xs font-bold text-primary grid place-items-center">
                  {c.section}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
