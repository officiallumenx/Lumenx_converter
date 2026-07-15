import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { prefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { useParentPortal } from "@/context/ParentPortalContext";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { achievements, performance, streaks, trend } from "@/lib/mock-data";
import {
  buildParentGrowthActivities,
  buildStudentGrowthActivities,
  filterGrowthStreaks,
  parentGrowthGoals,
  streaksFromAttendanceDays,
  studentGrowthGoals,
  type GrowthActivity,
} from "@/lib/growth/growth-data";
import { AchievementBadge } from "@/components/app/motivation/AchievementBadge";
import { GoalCard } from "@/components/app/motivation/GoalCard";
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
import {
  Award,
  Activity,
  TrendingUp,
  Flame,
  Target,
  MessageSquare,
  Trophy,
  ClipboardCheck,
  Bell,
} from "lucide-react";
import { Skeleton, cn } from "@lumenx/ui";

export const Route = createFileRoute("/growth")({
  head: () => ({ meta: [{ title: "Growth — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <GrowthPage />
    </AppShell>
  ),
});

const ACTIVITY_ICON = {
  achievement: Trophy,
  remark: MessageSquare,
  notification: Bell,
  attendance: ClipboardCheck,
  competition: Award,
  marks: TrendingUp,
} as const;

function GrowthPage() {
  const { role, activeChildId } = useApp();
  const portal = useParentPortal();
  const studentPortal = useStudentPortal();
  const isParent = role === "parent";
  const parentSnap = isParent && portal.isParent ? portal.snapshot : null;
  const studentSnap = !isParent && studentPortal.isStudent ? studentPortal.snapshot : null;
  const loading =
    (isParent && portal.isParent && portal.isLoading && !parentSnap) ||
    (!isParent && studentPortal.isStudent && studentPortal.isLoading && !studentSnap);

  const streaksView = useMemo(() => {
    if (parentSnap) return streaksFromAttendanceDays(parentSnap.attendanceDays, parentSnap.trend);
    if (studentSnap) return streaksFromAttendanceDays(studentSnap.attendanceDays, studentSnap.trend);
    return filterGrowthStreaks(streaks);
  }, [parentSnap, studentSnap]);

  const trendView = parentSnap?.trend ?? studentSnap?.trend ?? trend;
  const performanceView = parentSnap?.performance ?? studentSnap?.performance ?? performance;
  const achievementsView = parentSnap?.achievements ?? studentSnap?.achievements ?? achievements;
  const goalsView = useMemo(() => {
    if (parentSnap) return parentGrowthGoals(parentSnap);
    if (studentSnap) return studentGrowthGoals(studentSnap);
    return [];
  }, [parentSnap, studentSnap]);

  const activities = useMemo(() => {
    if (parentSnap) return buildParentGrowthActivities(parentSnap);
    if (studentSnap) return buildStudentGrowthActivities(studentSnap);
    return [];
  }, [parentSnap, studentSnap]);

  const attendanceStreak = streaksView.find((s) => s.id === "s-att" || /attendance/i.test(s.label));
  const improvementStreak = streaksView.find((s) => s.id === "s-imp" || /improvement/i.test(s.label));
  const badges = achievementsView.filter((a) => !a.progress);

  const subtitle = useMemo(() => {
    if (parentSnap) {
      return `${parentSnap.child.name} · ${parentSnap.classTag} · live streaks, goals, and milestones`;
    }
    if (studentSnap) {
      return `${studentSnap.profile.name} · Class ${studentSnap.profile.class}-${studentSnap.profile.section}`;
    }
    return "Streaks, goals, activities, and performance overview.";
  }, [parentSnap, studentSnap]);

  if (loading) {
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <PageHeader title={isParent ? "Your child's growth" : "Your growth"} subtitle="Loading…" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div key={isParent ? activeChildId : "student"} className="min-w-0 max-w-full">
      <PageHeader
        title={isParent ? "Your child's growth" : "Your growth"}
        subtitle={subtitle}
      />

      <div className="min-w-0 space-y-5">
        <EncouragementCarousel />

        {streaksView.length > 0 ? (
          <section className="space-y-3">
            <SectionHeading icon={Flame} label="Streaks" />
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              {attendanceStreak ? <StreakCard s={attendanceStreak} /> : null}
              {improvementStreak ? <StreakCard s={improvementStreak} /> : null}
            </div>
          </section>
        ) : null}

        {goalsView.length > 0 ? (
          <section className="space-y-3">
            <SectionHeading icon={Target} label={`Goals · ${goalsView.length}`} />
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              {goalsView.map((g) => (
                <GoalCard key={g.id} g={g} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <SectionHeading icon={Award} label={`Badges · ${badges.length}`} />
          {badges.length === 0 ? (
            <EmptyPanel message="No badges unlocked yet." />
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {badges.map((a) => (
                <AchievementBadge key={a.id} a={a} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeading icon={Activity} label="Recent activities" />
          {activities.length === 0 ? (
            <EmptyPanel message="No recent activity for this learner yet." />
          ) : (
            <div className="space-y-2">
              {activities.map((item) => (
                <GrowthActivityRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeading icon={TrendingUp} label="Performance summary & overview" />
          {trendView.length === 0 && performanceView.length === 0 ? (
            <EmptyPanel message="Performance charts will appear once term data is published." />
          ) : (
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
                        isAnimationActive={!prefersReducedMotion()}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-xs font-medium text-muted-foreground">
                  {trendView.length >= 2
                    ? `${trendView[trendView.length - 1].score - trendView[0].score >= 0 ? "+" : ""}${
                        trendView[trendView.length - 1].score - trendView[0].score
                      } points across ${trendView.length} terms`
                    : "Trend updates as new terms are published"}
                </div>
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
                      <Bar
                        dataKey="prev"
                        fill="oklch(0.86 0.04 250)"
                        radius={[6, 6, 0, 0]}
                        isAnimationActive={!prefersReducedMotion()}
                      />
                      <Bar
                        dataKey="score"
                        fill="oklch(0.55 0.22 260)"
                        radius={[6, 6, 0, 0]}
                        isAnimationActive={!prefersReducedMotion()}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function GrowthActivityRow({ item }: { item: GrowthActivity }) {
  const Icon = ACTIVITY_ICON[item.kind];
  const toneClass =
    item.tone === "positive"
      ? "border-success/30 bg-success/5"
      : item.tone === "warning"
        ? "border-warning/40 bg-warning/10"
        : "border-border bg-card";

  return (
    <article
      className={cn(
        "flex min-w-0 gap-3 rounded-2xl border p-4 shadow-soft sm:gap-4 sm:p-4",
        toneClass,
      )}
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <h3 className="font-semibold leading-snug break-words">{item.title}</h3>
          <time className="shrink-0 text-[11px] text-muted-foreground">{item.time}</time>
        </div>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed break-words">
          {item.description}
        </p>
      </div>
    </article>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
      {message}
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
