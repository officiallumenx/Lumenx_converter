import { memo, useMemo, useSyncExternalStore } from "react";
import { prefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { getInitials } from "@lumenx/utils";
import { Link } from "@tanstack/react-router";
import {
  ClipboardCheck,
  GraduationCap,
  Heart,
  ArrowRight,
  MessageSquare,
  BookOpen,
  PenLine,
  AlertTriangle,
} from "lucide-react";
import { StatCard } from "@/components/app/StatCard";
import { ChildSwitcher } from "@/components/app/ChildSwitcher";
import { children as allChildren, schoolAlerts } from "@/lib/mock-data";
import type { StudentAssignment } from "@/lib/mock-data";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { AlertsDashboardPanel, useAlertStoreInit } from "@/components/app/alerts/AlertsCenterView";
import { alertStore } from "@/lib/alert-store";
import {
  getAssignmentVisualStatus,
  ASSIGNMENT_STATUS_DOT,
  ASSIGNMENT_STATUS_LABEL,
  ASSIGNMENT_CARD_STYLES,
  todayWorkForChild,
} from "@/lib/assignment-status";
import { Badge, cn } from "@lumenx/ui";
import { Avatar, AvatarFallback } from "@lumenx/ui";
import { Button } from "@lumenx/ui";
import { Skeleton } from "@lumenx/ui";
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

export const ParentDashboardPage = memo(function ParentDashboardPage() {
  const { activeChildId } = useApp();
  useAlertStoreInit(schoolAlerts.parent);
  const portalAlerts = useSyncExternalStore(
    alertStore.subscribe,
    alertStore.getItems,
    alertStore.getItems,
  );
  const portal = useParentPortal();
  const child = useMemo(
    () => allChildren.find((c) => c.id === activeChildId) ?? allChildren[0],
    [activeChildId],
  );

  const snap = portal.isParent ? portal.snapshot : null;
  const loading = portal.isParent && portal.isLoading;

  const performance = snap?.performance;
  const trend = snap?.trend;
  const remarks = snap?.remarks ?? [];
  const childAssignments = snap?.assignments ?? [];

  const todayAssignments = useMemo(
    () => todayWorkForChild(childAssignments, "assignment").slice(0, 4),
    [childAssignments],
  );
  const todayHomework = useMemo(
    () => todayWorkForChild(childAssignments, "homework").slice(0, 4),
    [childAssignments],
  );

  const overdueCount = useMemo(
    () =>
      childAssignments.filter(
        (a) => a.status === "pending" && getAssignmentVisualStatus(a) === "overdue",
      ).length,
    [childAssignments],
  );

  const focusSubjects = useMemo(() => {
    const weak = (performance ?? []).filter((p) => p.score < 75).map((p) => p.subject);
    return weak.length ? weak.slice(0, 2).join(", ") : "None flagged";
  }, [performance]);

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
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
              {overdueCount > 0 ? (
                <Badge variant="outline" className="border-destructive/40 text-destructive">
                  {overdueCount} overdue item{overdueCount === 1 ? "" : "s"}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex w-full min-w-0 shrink-0 gap-2 sm:w-auto">
            <Link to="/messages" className="min-w-0 flex-1 sm:flex-none">
              <Button variant="outline" className="parent-hero-action w-full gap-2 rounded-xl">
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
          value={String((performance ?? []).filter((p) => p.score < 75).length || "0")}
          tone="warning"
          hint={focusSubjects}
        />
        <StatCard
          icon={PenLine}
          label="Teacher remarks"
          value={String(remarks.length)}
          hint={remarks.length ? "Latest this week" : "None yet"}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        <PendingWorkPanel
          title="Today's assignments"
          icon={BookOpen}
          items={todayAssignments}
          emptyLabel="No assignments due today"
          viewAllLabel="All assignments"
        />
        <PendingWorkPanel
          title="Today's homework"
          icon={BookOpen}
          items={todayHomework}
          emptyLabel="No homework due today"
          viewAllLabel="All homework"
        />
        <AlertsDashboardPanel alerts={portalAlerts} childId={activeChildId} />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft md:p-5 lg:col-span-3">
          <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
            <h3 className="min-w-0 truncate font-semibold">Subject performance</h3>
            <Link to="/marks" className="parent-section-link whitespace-nowrap">
              Details <ArrowRight className="size-3 shrink-0" aria-hidden />
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
                  isAnimationActive={!prefersReducedMotion()}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 items-stretch lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col h-full sm:p-5">
          <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
            <h3 className="min-w-0 font-semibold">Latest from teachers</h3>
            <Link to="/messages" className="parent-section-link whitespace-nowrap">
              Message teacher <ArrowRight className="size-3 shrink-0" aria-hidden />
            </Link>
          </div>
          <p className="mb-3 text-xs text-muted-foreground leading-relaxed">
            Formal feedback from class teachers about your child&apos;s progress — not shown on the
            student portal.
          </p>
          <div className="min-w-0 flex-1 space-y-3">
            {remarks.length === 0 ? (
              <p className="parent-empty-state py-8">No remarks yet.</p>
            ) : (
              remarks.map((r, i) => (
                <div key={i} className="flex min-w-0 gap-3 rounded-xl bg-muted/40 p-3">
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="text-xs">
                      {getInitials(r.teacher)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          r.tone === "warning" &&
                            "border-warning/40 text-warning-foreground bg-warning/10",
                          r.tone === "positive" && "border-success/40 text-success bg-success/10",
                        )}
                      >
                        {r.tone === "warning" ? "Needs attention" : "Positive"}
                      </Badge>
                    </div>
                    <div className="mt-1.5 text-sm leading-snug break-words">{r.text}</div>
                    <div className="mt-1 text-xs leading-snug text-muted-foreground break-words line-clamp-2">
                      {r.teacher} • {r.subject} • {r.date}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col h-full sm:p-5">
          <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
            <h3 className="min-w-0 truncate font-semibold">Recent updates</h3>
            <Link to="/notifications" className="parent-section-link whitespace-nowrap">
              View all <ArrowRight className="size-3 shrink-0" aria-hidden />
            </Link>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {(snap?.notifications ?? []).slice(0, 4).map((n) => (
              <div
                key={n.id}
                className="parent-list-row flex min-w-0 items-start gap-2 rounded-xl border border-border p-3 sm:gap-3"
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
                <div className="max-w-[4.5rem] shrink-0 self-start text-right text-xs leading-tight text-muted-foreground sm:max-w-[5.5rem]">
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

function PendingWorkPanel({
  title,
  icon: Icon,
  items,
  emptyLabel,
  viewAllLabel,
}: {
  title: string;
  icon: typeof BookOpen;
  items: StudentAssignment[];
  emptyLabel: string;
  viewAllLabel: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col sm:p-5">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-primary" />
          <h3 className="min-w-0 font-semibold leading-snug">{title}</h3>
        </div>
        <Link to="/assignments" className="parent-section-link whitespace-nowrap">
          {viewAllLabel} <ArrowRight className="size-3 shrink-0" aria-hidden />
        </Link>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {items.length === 0 ? (
          <p className="parent-empty-state py-8">{emptyLabel}</p>
        ) : (
          items.map((a) => {
            const visual = getAssignmentVisualStatus(a);
            const cardStyle = ASSIGNMENT_CARD_STYLES[visual];
            return (
              <Link
                key={a.id}
                to="/assignments"
                className={cn(
                  "parent-list-row flex min-w-0 items-start gap-2.5 rounded-xl border p-3 hover:shadow-sm",
                  visual === "overdue" ? cardStyle.card : cn("bg-card", cardStyle.card),
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    ASSIGNMENT_STATUS_DOT[visual],
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug line-clamp-2 break-words">
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {a.subject} • {ASSIGNMENT_STATUS_LABEL[visual]} • {a.due}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
