import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { achievements, streaks, trend, performance } from "@/lib/mock-data";
import { AchievementBadge } from "@/components/app/motivation/AchievementBadge";
import { StreakCard } from "@/components/app/motivation/StreakCard";
import { EncouragementCarousel } from "@/components/app/motivation/EncouragementCarousel";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  YAxis,
} from "recharts";
import { Award, Activity, TrendingUp, Flame } from "lucide-react";
import { Skeleton } from "@lumenx/ui";
import { cn } from "@lumenx/ui";

const GROWTH_ACTIVITIES = [
  {
    id: "act-1",
    label: "Submitted Chemistry lab report on time",
    when: "2 hours ago",
    tone: "success" as const,
  },
  {
    id: "act-2",
    label: "Attended all classes today — streak day 18",
    when: "Today",
    tone: "primary" as const,
  },
  {
    id: "act-3",
    label: "Math quiz score improved by +8 points",
    when: "Yesterday",
    tone: "warning" as const,
  },
  {
    id: "act-4",
    label: "Joined school athletics practice",
    when: "2 days ago",
    tone: "muted" as const,
  },
];

const ACTIVITY_TONE: Record<(typeof GROWTH_ACTIVITIES)[number]["tone"], string> = {
  success: "bg-success/10 text-success",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  muted: "bg-muted text-muted-foreground",
};

export const Route = createFileRoute("/growth")({
  head: () => ({ meta: [{ title: "Growth — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <GrowthPage />
    </AppShell>
  ),
});

function GrowthPage() {
  const { role } = useApp();
  const portal = useParentPortal();
  const isParent = role === "parent";
  const snap = isParent && portal.isParent ? portal.snapshot : null;
  const parentBoot = isParent && portal.isParent && portal.isLoading && !snap;

  const streaksView = snap?.streaks ?? streaks;
  const trendView = snap?.trend ?? trend;
  const performanceView = snap?.performance ?? performance;
  const achievementsView = snap?.achievements ?? achievements;

  const attendanceStreak = useMemo(
    () => streaksView.find((s) => s.id === "s-att" || /attendance/i.test(s.label)),
    [streaksView],
  );
  const assignmentStreak = useMemo(
    () => streaksView.find((s) => s.id === "s-asg" || /assignment/i.test(s.label)),
    [streaksView],
  );
  const improvementStreak = useMemo(
    () => streaksView.find((s) => s.id === "s-imp" || /improvement/i.test(s.label)),
    [streaksView],
  );

  const badges = achievementsView.filter((a) => !a.progress);

  if (parentBoot) {
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <PageHeader title="Your child's growth" subtitle="Loading this learner's growth profile…" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title={isParent ? "Your child's growth" : "Your growth"}
        subtitle={
          isParent
            ? "Streaks, badges, activities, and performance overview."
            : "Streaks, badges, activities, and performance overview."
        }
      />

      <div className="min-w-0 space-y-5">
        <EncouragementCarousel />

        <section className="space-y-3">
          <SectionHeading icon={Flame} label="Streaks" />
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            {attendanceStreak ? <StreakCard s={attendanceStreak} /> : null}
            {assignmentStreak ? <StreakCard s={assignmentStreak} /> : null}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeading icon={Award} label={`Badges · ${badges.length}`} />
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((a) => (
              <AchievementBadge key={a.id} a={a} />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeading icon={Activity} label="Recent activities" />
          <div className="min-w-0 rounded-2xl border border-border bg-card shadow-soft divide-y divide-border">
            {GROWTH_ACTIVITIES.map((act) => (
              <div key={act.id} className="flex min-w-0 items-start gap-3 px-4 py-3 sm:px-5">
                <span
                  className={cn(
                    "mt-0.5 size-2 shrink-0 rounded-full",
                    act.tone === "success" && "bg-success",
                    act.tone === "primary" && "bg-primary",
                    act.tone === "warning" && "bg-warning",
                    act.tone === "muted" && "bg-muted-foreground/40",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug break-words">{act.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{act.when}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    ACTIVITY_TONE[act.tone],
                  )}
                >
                  {act.tone === "muted" ? "Event" : "Win"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeading icon={TrendingUp} label="Performance summary & overview" />
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft md:p-5">
              <h3 className="mb-3 font-semibold">Improvement trend</h3>
              <div className="h-56 w-full min-w-0 max-w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendView}>
                    <defs>
                      <linearGradient id="gw" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.7 0.16 155)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="oklch(0.7 0.16 155)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="term"
                      stroke="oklch(0.5 0.02 260)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis hide domain={[60, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="oklch(0.7 0.16 155)"
                      strokeWidth={2.5}
                      fill="url(#gw)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-success font-medium mt-2">+12 points across 5 terms</div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft md:p-5">
              <h3 className="mb-3 font-semibold">Subject performance</h3>
              <div className="h-56 w-full min-w-0 max-w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceView}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.92 0.01 250)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="subject"
                      stroke="oklch(0.5 0.02 260)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="oklch(0.5 0.02 260)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                      }}
                    />
                    <Bar dataKey="prev" fill="oklch(0.86 0.04 250)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="score" fill="oklch(0.55 0.22 260)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {improvementStreak ? (
          <section className="space-y-3">
            <SectionHeading icon={TrendingUp} label="Improvement streak" />
            <div className="max-w-md">
              <StreakCard s={improvementStreak} />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function SectionHeading({ icon: Icon, label }: { icon: typeof Flame; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="size-4 shrink-0 text-primary" />
      <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </h2>
    </div>
  );
}
