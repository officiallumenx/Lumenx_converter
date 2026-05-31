import { memo, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ClipboardCheck,
  GraduationCap,
  AlertTriangle,
  Heart,
  ArrowRight,
  MessageSquare,
  Trophy,
} from "lucide-react";
import { StatCard } from "../StatCard";
import { ChildSwitcher } from "../ChildSwitcher";
import { children as allChildren } from "@/lib/mock-data";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { AchievementBadge } from "../motivation/AchievementBadge";
import { StreakCard } from "../motivation/StreakCard";

export const ParentDashboard = memo(function ParentDashboard() {
  const { activeChildId } = useApp();
  const portal = useParentPortal();
  const child = useMemo(
    () => allChildren.find((c) => c.id === activeChildId) ?? allChildren[0],
    [activeChildId],
  );

  const snap = portal.isParent ? portal.snapshot : null;
  const loading = portal.isParent && portal.isLoading;

  const performance = snap?.performance;
  const trend = snap?.trend;
  const remarks = snap?.remarks;
  const streaks = snap?.streaks;
  const achievementsList = snap?.achievements ?? [];

  if (loading && !snap) {
    return (
      <div className="min-w-0 max-w-full space-y-4 md:space-y-6">
        <ChildSwitcher />
        <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 md:space-y-6">
      <ChildSwitcher />
      <div className="rounded-3xl bg-card border border-border p-5 md:p-7 shadow-soft relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-60 pointer-events-none" />
        <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center md:gap-8">
          <Avatar className="size-16 md:size-20 ring-4 ring-primary/10">
            <AvatarFallback className="bg-gradient-primary font-display text-lg text-primary-foreground sm:text-xl">
              {child.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground uppercase tracking-widest">
              Your child
            </div>
            <h2 className="font-display mt-0.5 truncate text-xl font-semibold sm:text-2xl md:text-3xl">
              {child.name}
            </h2>
            <div className="mt-1 break-words text-xs text-muted-foreground sm:text-sm">
              {child.className} • Section {child.section} • Roll {child.rollNo}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className="bg-success/15 text-success hover:bg-success/20 border-0">
                <Heart className="size-3 mr-1" /> Doing well
              </Badge>
              <Badge variant="outline">Attendance {child.attendance}%</Badge>
            </div>
          </div>
          <div className="flex w-full min-w-0 shrink-0 gap-2 sm:w-auto">
            <Link to="/messages" className="min-w-0 flex-1 sm:flex-none">
              <Button variant="outline" className="w-full gap-2 rounded-xl">
                <MessageSquare className="size-4" /> Message
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 auto-rows-fr grid-cols-2 items-stretch gap-2.5 sm:gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          icon={ClipboardCheck}
          label="This month"
          value={`${child.attendance}%`}
          tone="success"
          hint={`${100 - child.attendance > 0 ? Math.max(1, Math.round((100 - child.attendance) / 5)) : 0} absences`}
        />
        <StatCard
          icon={GraduationCap}
          label="Avg score"
          value={`${child.avgScore}%`}
          tone="primary"
          hint="+4% vs last term"
        />
        <StatCard
          icon={AlertTriangle}
          label="Focus areas"
          value="2"
          tone="warning"
          hint="Chemistry, History"
        />
        <StatCard icon={MessageSquare} label="Remarks" value="3" hint="This week" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft md:p-5">
        <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Trophy className="size-4 shrink-0 text-primary" />
            <h3 className="min-w-0 font-semibold leading-snug line-clamp-2 break-words">
              {child.name.split(" ")[0]}'s milestones
            </h3>
          </div>
          <Link
            to="/growth"
            className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
          >
            View growth <ArrowRight className="size-3 shrink-0" />
          </Link>
        </div>
        <div className="grid min-w-0 auto-rows-fr grid-cols-1 items-stretch gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {achievementsList
            .filter((a) => !a.progress)
            .slice(0, 3)
            .map((a) => (
              <AchievementBadge key={a.id} a={a} />
            ))}
        </div>
        <div className="grid min-w-0 auto-rows-fr grid-cols-1 items-stretch gap-2.5 sm:gap-3">
          {(streaks ?? []).map((s) => (
            <StreakCard key={s.id} s={s} />
          ))}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft md:p-5 lg:col-span-3">
          <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
            <h3 className="min-w-0 truncate font-semibold">Subject performance</h3>
            <Link
              to="/exams"
              className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
            >
              Details <ArrowRight className="size-3 shrink-0" />
            </Link>
          </div>
          <div className="h-56 w-full min-w-0 max-w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performance ?? []}>
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

        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft md:p-5 lg:col-span-2">
          <h3 className="mb-3 font-semibold">Improvement trend</h3>
          <div className="h-56 w-full min-w-0 max-w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend ?? []}>
                <defs>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#g2)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 items-stretch lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col h-full sm:p-5">
          <h3 className="mb-3 font-semibold">Latest from teachers</h3>
          <div className="min-w-0 flex-1 space-y-3">
            {(remarks ?? []).map((r, i) => (
              <div key={i} className="flex min-w-0 gap-3 rounded-xl bg-muted/40 p-3">
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="text-xs">
                    {r.teacher
                      .split(" ")
                      .map((p) => p[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-snug break-words">{r.text}</div>
                  <div className="mt-1 text-xs leading-snug text-muted-foreground break-words line-clamp-2">
                    {r.teacher} • {r.subject} • {r.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col h-full sm:p-5">
          <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
            <h3 className="min-w-0 truncate font-semibold">Recent updates</h3>
            <Link
              to="/notifications"
              className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
            >
              View all <ArrowRight className="size-3 shrink-0" />
            </Link>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {(snap?.notifications ?? []).slice(0, 4).map((n) => (
              <div
                key={n.id}
                className="flex min-w-0 items-start gap-2 rounded-xl border border-border p-3 sm:gap-3"
              >
                <div
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${n.type === "warning" ? "bg-warning" : n.type === "positive" ? "bg-success" : "bg-primary"}`}
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
    </div>
  );
});
