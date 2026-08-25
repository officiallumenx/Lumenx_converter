import { memo, useMemo, useSyncExternalStore } from "react";
import { prefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { getInitials } from "@lumenx/utils";
import { Link, useLocation } from "@tanstack/react-router";
import {
  ClipboardCheck,
  GraduationCap,
  ArrowRight,
  MessageSquare,
  BookOpen,
  PenLine,
  AlertTriangle,
  Calendar,
  Trophy,
  Bell,
} from "lucide-react";
import { StatCard } from "@/components/app/StatCard";
import { ChildSwitcher } from "@/components/app/ChildSwitcher";
import { children as allChildren, days, schoolAlerts } from "@/lib/mock-data";
import type { StudentAssignment } from "@/lib/mock-data";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { AlertsDashboardPanel, useAlertStoreInit } from "@/components/app/alerts/AlertsCenterView";
import { alertStore } from "@/lib/alert-store";
import {
  todayWorkForChild,
} from "@/lib/assignment-status";
import {
  STUDENT_MODULE_COLORS,
  studentModuleCardStyle,
  studentModuleLightChip,
} from "@/lib/student/nav";
import {
  getParentNavItem,
  isParentRouteActive,
} from "@/lib/parent/nav";
import { Badge, cn, DashboardCustomizeBar, DashboardLayoutProvider, DashboardWidgets, type DashboardWidgetDef } from "@lumenx/ui";
import { Avatar, AvatarFallback } from "@lumenx/ui";
import { Button } from "@lumenx/ui";
import { Skeleton } from "@lumenx/ui";
import {
  buildLearnerAttendanceDays,
  computeAttendanceSummary,
  formatDisplayDate,
  isoFromParts,
} from "@/lib/attendance/calendar";
import { attendanceSectionKey, toAttendanceStudentId } from "@/lib/attendance/section-key";
import {
  buildLearnerAttendanceNotifications,
  labelForAttendanceStatus,
  resolveLearnerTodayAttendance,
} from "@lumenx/module-attendance";
import { resolveParentChildAttendanceStudentId } from "@/lib/attendance/notification-bridge";
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

function parentGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const QUICK_LINK_DEFS = [
  { to: "/attendance", icon: ClipboardCheck },
  { to: "/timetable", icon: Calendar },
  { to: "/assignments", icon: BookOpen },
  { to: "/sports", icon: Trophy },
  { to: "/marks", icon: GraduationCap },
  { to: "/messages", icon: MessageSquare },
] as const;

const QUICK_LINKS = QUICK_LINK_DEFS.map(({ to, icon }) => {
  const nav = getParentNavItem(to)!;
  return { to, label: nav.label, icon, moduleColor: nav.moduleColor };
});

const PARENT_HOME_WIDGETS: DashboardWidgetDef[] = [
  { id: "stats", label: "Snapshot" },
  { id: "attendance", label: "Attendance" },
  { id: "quick-actions", label: "Quick Actions" },
  { id: "today-work", label: "Today's work" },
  { id: "performance", label: "Performance" },
  { id: "updates", label: "Updates" },
];

export const ParentDashboardPage = memo(function ParentDashboardPage() {
  const { activeChildId, activeInstituteId } = useApp();
  const { pathname } = useLocation();
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

  const focusSubjects = useMemo(() => {
    const weak = (performance ?? []).filter((p) => p.score < 75).map((p) => p.subject);
    return weak.length ? weak.slice(0, 2).join(", ") : "None flagged";
  }, [performance]);

  const today = days[Math.max(0, Math.min(5, new Date().getDay() - 1))];
  const firstName = child.name.split(" ")[0];
  const unreadNotifications = (snap?.notifications ?? []).filter((n) => n.unread).length;
  const todayWorkCount = todayAssignments.length + todayHomework.length;

  const attendanceToday = useMemo(() => {
    const now = new Date();
    const iso = isoFromParts(now.getFullYear(), now.getMonth(), now.getDate());
    const sectionKey = attendanceSectionKey(child.className, child.section);
    const attendanceStudentId = toAttendanceStudentId({
      id: child.id,
      classLabel: child.className,
      section: child.section,
      rollNo: child.rollNo,
    });
    const fromRegister = resolveLearnerTodayAttendance({
      studentId: attendanceStudentId,
      sectionKey,
      date: iso,
    });
    return {
      status: fromRegister.status,
      label: fromRegister.label,
      date: iso,
      displayDate: formatDisplayDate(iso),
      fromRegister: fromRegister.fromRegister,
    };
  }, [child.className, child.section, child.id, child.rollNo]);

  const attendanceHistory = useMemo(() => {
    const now = new Date();
    const sectionKey = attendanceSectionKey(child.className, child.section);
    const attendanceStudentId = toAttendanceStudentId({
      id: child.id,
      classLabel: child.className,
      section: child.section,
      rollNo: child.rollNo,
    });
    const monthDays = buildLearnerAttendanceDays({
      year: now.getFullYear(),
      month: now.getMonth(),
      studentId: attendanceStudentId,
      sectionKey,
    });
    const summary = computeAttendanceSummary(monthDays, now.getFullYear(), now.getMonth());
    const recent = monthDays
      .filter((d) => d.status !== "future" && d.day <= now.getDate())
      .slice(-5)
      .reverse()
      .map((d) => ({
        day: d.day,
        status: d.status,
        label: labelForAttendanceStatus(d.status),
        iso: isoFromParts(now.getFullYear(), now.getMonth(), d.day),
      }));
    return { summary, recent };
  }, [child.className, child.section, child.id, child.rollNo]);

  const attendanceNotifs = useMemo(
    () =>
      buildLearnerAttendanceNotifications({
        recipient: "parent",
        studentId: resolveParentChildAttendanceStudentId(child),
        limit: 5,
      }),
    [child],
  );

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

      <div className="student-home-hero relative overflow-hidden rounded-3xl border p-4 shadow-soft sm:p-5 md:p-6">
        <div className="student-home-hero__gradient pointer-events-none absolute inset-0" aria-hidden />
        <div className="student-home-hero__glow pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/20 blur-3xl" aria-hidden />
        <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center md:gap-6">
          <Avatar className="size-14 shrink-0 ring-2 ring-white/30 sm:size-16">
            <AvatarFallback className="bg-white/20 font-display text-base font-semibold text-white sm:text-lg">
              {getInitials(child.name, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-white/75">
              {parentGreeting()}
            </p>
            <h2 className="mt-0.5 font-display text-xl font-semibold leading-snug break-words text-white sm:text-2xl md:text-3xl">
              {firstName}
            </h2>
            <p className="mt-1 text-sm text-white/85">
              Your child · Today, {today}
            </p>
            <p className="mt-0.5 text-xs text-white/75 sm:text-sm">
              {child.className} · Section {child.section} · Roll {child.rollNo}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="border-white/25 bg-white/15 text-white backdrop-blur-sm"
              >
                Attendance {attendanceHistory.summary.attendancePct}%
              </Badge>
              <Badge
                variant="outline"
                className="border-white/25 bg-white/15 text-white backdrop-blur-sm"
              >
                {todayWorkCount} due today
              </Badge>
              {unreadNotifications > 0 ? (
                <Badge
                  variant="outline"
                  className="border-white/30 bg-white/20 text-white backdrop-blur-sm"
                >
                  {unreadNotifications} unread
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex w-full min-w-0 shrink-0 gap-2 sm:w-auto">
            <Link to="/messages" className="min-w-0 flex-1 sm:flex-none">
              <Button
                variant="outline"
                className="parent-hero-action w-full gap-2 rounded-xl border-white/30 bg-white/15 text-white backdrop-blur-sm hover:bg-white/25 hover:text-white"
              >
                <MessageSquare className="size-4" /> Message
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <DashboardLayoutProvider
        storageKey={`connect.parent.${activeInstituteId ?? "default"}`}
        widgets={PARENT_HOME_WIDGETS}
      >
        <div className="min-w-0 space-y-4 md:space-y-6">
        <DashboardCustomizeBar />
        <DashboardWidgets
          render={(id) => {
            if (id === "stats") {
              return (
      <div className="grid min-w-0 auto-rows-fr grid-cols-2 items-stretch gap-2.5 sm:gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          icon={ClipboardCheck}
          label="This month"
          value={`${attendanceHistory.summary.attendancePct}%`}
          tone="success"
          moduleColor={STUDENT_MODULE_COLORS.green}
          hint={
            attendanceHistory.summary.absent > 0
              ? `${attendanceHistory.summary.absent} absence${attendanceHistory.summary.absent === 1 ? "" : "s"}`
              : "No absences"
          }
        />
        <StatCard
          icon={GraduationCap}
          label="Avg score"
          value={`${child.avgScore}%`}
          tone="primary"
          moduleColor={STUDENT_MODULE_COLORS.indigo}
          hint="+4% vs last term"
        />
        <StatCard
          icon={AlertTriangle}
          label="Focus areas"
          value={String((performance ?? []).filter((p) => p.score < 75).length || "0")}
          tone="warning"
          moduleColor={STUDENT_MODULE_COLORS.amber}
          hint={focusSubjects}
        />
        <StatCard
          icon={PenLine}
          label="Teacher remarks"
          value={String(remarks.length)}
          moduleColor={STUDENT_MODULE_COLORS.cyan}
          hint={remarks.length ? "Latest this week" : "None yet"}
        />
      </div>
              );
            }
            if (id === "attendance") {
              return (
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-semibold">Today's Attendance</h3>
            <Link to="/attendance" className="parent-section-link whitespace-nowrap">
              Calendar <ArrowRight className="size-3 shrink-0" aria-hidden />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">{attendanceToday.displayDate}</p>
          <p className="mt-2 text-2xl font-semibold">{attendanceToday.label}</p>
          <Badge
            variant="outline"
            className={cn(
              "mt-3",
              attendanceToday.status === "present" && "border-success/40 text-success",
              attendanceToday.status === "absent" && "border-destructive/40 text-destructive",
              attendanceToday.status === "leave" && "border-warning/40 text-warning-foreground",
            )}
          >
            {attendanceToday.fromRegister ? "From register" : attendanceToday.status}
          </Badge>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-semibold">Attendance history</h3>
            <Link to="/attendance" className="parent-section-link whitespace-nowrap">
              Full history <ArrowRight className="size-3 shrink-0" aria-hidden />
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            {attendanceHistory.summary.monthLabel} · {attendanceHistory.summary.attendancePct}% ·{" "}
            {attendanceHistory.summary.present}P / {attendanceHistory.summary.absent}A
          </p>
          <ul className="mt-3 space-y-2">
            {attendanceHistory.recent.map((row) => (
              <li
                key={row.iso}
                className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{formatDisplayDate(row.iso)}</span>
                <span className="font-medium">{row.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-semibold">Attendance Alerts</h3>
            <Link to="/notifications" className="parent-section-link whitespace-nowrap">
              All <ArrowRight className="size-3 shrink-0" aria-hidden />
            </Link>
          </div>
          {attendanceNotifs.length ? (
            <ul className="space-y-2">
              {attendanceNotifs.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "rounded-xl border p-3 text-sm",
                    n.unread ? "border-primary/30 bg-primary/5" : "border-border",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Bell className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{n.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No attendance alerts yet. Absences and late entries appear here when configured.
            </p>
          )}
        </div>
      </div>
              );
            }
            if (id === "quick-actions") {
              return (
      <div className="flex h-full min-h-0 min-w-0 max-w-full flex-col rounded-2xl border border-border bg-card p-3 shadow-soft sm:p-4">
        <div className="mb-2 flex min-w-0 items-start justify-between gap-2 sm:items-center">
          <h3 className="min-w-0 flex-1 font-semibold leading-snug">Quick Actions</h3>
        </div>
        <div className="grid min-w-0 grid-cols-2 items-stretch gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_LINKS.map((q) => {
            const selected = isParentRouteActive(pathname, q.to);
            return (
              <Link
                key={q.to}
                to={q.to}
                className="student-quick-link text-foreground"
                style={studentModuleCardStyle(q.moduleColor, selected)}
                aria-current={selected ? "page" : undefined}
              >
                <span
                  className="student-quick-link__icon"
                  style={{
                    color: q.moduleColor.primary,
                    backgroundColor: studentModuleLightChip(q.moduleColor),
                  }}
                >
                  <q.icon className="size-4 shrink-0" />
                </span>
                <span className="student-module-name min-w-0 flex-1 truncate leading-tight">
                  {q.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
              );
            }
            if (id === "today-work") {
              return (
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
              );
            }
            if (id === "performance") {
              return (
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
              );
            }
            if (id === "updates") {
              return (
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
              );
            }
            return null;
          }}
        />
        </div>
      </DashboardLayoutProvider>
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
          items.map((a) => (
              <Link
                key={a.id}
                to="/assignments"
                className="parent-list-row flex min-w-0 items-start gap-2.5 rounded-xl border border-border bg-card p-3 hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug line-clamp-2 break-words">
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {a.subject} • Due {a.due}
                  </p>
                </div>
              </Link>
            ))
        )}
      </div>
    </div>
  );
}
