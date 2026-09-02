import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  GraduationCap,
  Calendar,
  TrendingUp,
  ArrowRight,
  Bell,
  Trophy,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { StatCard } from "@/components/app/StatCard";
import { days } from "@/lib/mock-data";
import { getInitials } from "@lumenx/utils";
import { prefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { studentNotificationStore } from "@/lib/student/notification-store";
import { useStudentPortal } from "@/context/StudentPortalContext";
import {
  Badge,
  cn,
  Progress,
  Avatar,
  AvatarFallback,
  DashboardCustomizeBar,
  DashboardLayoutProvider,
  DashboardWidgets,
  type DashboardWidgetDef,
} from "@lumenx/ui";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { AchievementBadge } from "@/components/app/motivation/AchievementBadge";
import { useSyncExternalStore } from "react";
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import { loadConnectEvents, pickUpcomingEvents, type ConnectEventItem } from "@/lib/events";
import { loadLearnerExamSchedules, type LearnerExamSchedule } from "@/lib/exams";
import { formatEventDate } from "@/components/app/events/events-shared";
import { PageSkeleton, EmptyState } from "@/student-portal/shared/ui";
import {
  STUDENT_MODULE_COLORS,
  STUDENT_NOTIFICATION_COLOR,
  getStudentNavItem,
  isStudentRouteActive,
  studentModuleCardStyle,
  studentModuleLightChip,
} from "@/lib/student/nav";
import {
  buildLearnerAttendanceDays,
  computeAttendanceSummary,
  formatDisplayDate,
  isoFromParts,
} from "@/lib/attendance/calendar";
import { attendanceSectionKey, toAttendanceStudentId } from "@/lib/attendance/section-key";
import {
  labelForAttendanceStatus,
  resolveLearnerTodayAttendance,
} from "@lumenx/module-attendance";

function studentGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const STAT_CARDS = [
  {
    to: "/attendance",
    icon: ClipboardCheck,
    label: "Attendance",
    moduleColor: STUDENT_MODULE_COLORS.green,
    tone: "success" as const,
    valueKey: "attendance" as const,
    hint: "This month",
  },
  {
    to: "/marks",
    icon: GraduationCap,
    label: "Avg Score",
    moduleColor: STUDENT_MODULE_COLORS.indigo,
    tone: "default" as const,
    valueKey: "score" as const,
    hint: "Latest report",
  },
  {
    to: "/exams",
    icon: BookOpen,
    label: "Upcoming exams",
    moduleColor: STUDENT_MODULE_COLORS.red,
    tone: "default" as const,
    valueKey: "exams" as const,
    hint: "Scheduled",
  },
  {
    to: "/certificates",
    icon: Trophy,
    label: "Certificates",
    moduleColor: STUDENT_MODULE_COLORS.fuchsia,
    tone: "default" as const,
    valueKey: "certificates" as const,
    hint: "View & download",
  },
] as const;

const QUICK_LINK_DEFS = [
  { to: "/attendance", icon: ClipboardCheck },
  { to: "/timetable", icon: Calendar },
  { to: "/assignments", icon: BookOpen },
  { to: "/sports", icon: Trophy },
  { to: "/marks", icon: GraduationCap },
  { to: "/messages", icon: MessageSquare },
] as const;

const QUICK_LINKS = QUICK_LINK_DEFS.map(({ to, icon }) => {
  const nav = getStudentNavItem(to)!;
  return { to, label: nav.label, icon, moduleColor: nav.moduleColor };
});

const STUDENT_HOME_WIDGETS: DashboardWidgetDef[] = [
  { id: "stats", label: "Snapshot" },
  { id: "attendance", label: "Attendance" },
  { id: "quick-actions", label: "Quick Actions" },
  { id: "activity", label: "Activity" },
  { id: "achievements", label: "Achievements" },
  { id: "academics", label: "Academics" },
];

export function StudentDashboardPage() {
  const portal = useStudentPortal();
  const { activeInstituteId } = useApp();
  const { pathname } = useLocation();
  const [apiUpcomingEvents, setApiUpcomingEvents] = useState<ConnectEventItem[] | null>(null);
  const [apiUpcomingExams, setApiUpcomingExams] = useState<LearnerExamSchedule[] | null>(null);

  useEffect(() => {
    if (!isApiAuthMode()) {
      setApiUpcomingEvents(null);
      setApiUpcomingExams(null);
      return;
    }
    let cancelled = false;
    void loadConnectEvents({ instituteId: activeInstituteId }).then((result) => {
      if (cancelled) return;
      if (result.status === "ready" || result.status === "empty") {
        setApiUpcomingEvents(pickUpcomingEvents(result.items, 3));
      } else {
        setApiUpcomingEvents([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId]);

  useEffect(() => {
    if (!isApiAuthMode() || !activeInstituteId || !portal.snapshot) {
      setApiUpcomingExams(null);
      return;
    }
    let cancelled = false;
    void loadLearnerExamSchedules({
      instituteId: activeInstituteId,
      classGrade: portal.snapshot.profile.class,
    }).then((result) => {
      if (cancelled) return;
      if (result.status === "ready" || result.status === "empty") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setApiUpcomingExams(
          result.schedules.filter((s) => new Date(s.endDate) >= today).slice(0, 3),
        );
      } else {
        setApiUpcomingExams([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, portal.snapshot?.profile.class]);

  const notifications = useSyncExternalStore(
    studentNotificationStore.subscribe,
    studentNotificationStore.getItems,
    studentNotificationStore.getItems,
  );

  if (!portal.isStudent) return null;
  if (portal.isLoading || !portal.snapshot) return <PageSkeleton rows={5} />;

  const snap = portal.snapshot;
  const today = days[Math.max(0, Math.min(5, new Date().getDay() - 1))];
  const todayClasses = snap.timetable[today] ?? [];
  const weak = [...snap.performance].sort((a, b) => a.score - b.score).slice(0, 2);
  const recentAch = snap.achievements.filter((a) => !a.progress).slice(0, 3);
  const publishedCard = [...snap.reportCards].filter((r) => r.status === "published").at(-1);
  const upcomingExams = apiUpcomingExams ?? snap.exams.slice(0, 3);
  const upcomingExamCount =
    apiUpcomingExams !== null
      ? apiUpcomingExams.length
      : snap.exams.length;
  const demoUpcomingEvents = snap.schoolEvents.filter((e) => e.kind !== "holiday").slice(0, 3);
  const upcomingEvents = apiUpcomingEvents ?? demoUpcomingEvents;
  const recentNotifications = notifications.slice(0, 4);
  const unreadNotifications = notifications.filter((n) => n.unread).length;
  const firstName = snap.profile.name.split(" ")[0];
  const trendDelta =
    snap.trend.length >= 2
      ? snap.trend[snap.trend.length - 1]!.score - snap.trend[0]!.score
      : 0;

  const now = new Date();
  const todayIso = isoFromParts(now.getFullYear(), now.getMonth(), now.getDate());
  const sectionKey = attendanceSectionKey(snap.profile.class, snap.profile.section);
  const attendanceStudentId = toAttendanceStudentId({
    id: snap.profile.id,
    classLabel: snap.profile.class,
    section: snap.profile.section,
    rollNo: snap.profile.rollNo,
  });
  const monthDays = buildLearnerAttendanceDays({
    year: now.getFullYear(),
    month: now.getMonth(),
    studentId: attendanceStudentId,
    sectionKey,
  });
  const fromRegister = resolveLearnerTodayAttendance({
    studentId: attendanceStudentId,
    sectionKey,
    date: todayIso,
  });
  const todayStatus = fromRegister.status;
  const monthSummary = computeAttendanceSummary(monthDays, now.getFullYear(), now.getMonth());
  const recentHistory = monthDays
    .filter((d) => d.status !== "future" && d.day <= now.getDate())
    .slice(-5)
    .reverse();

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="student-home-hero relative overflow-hidden rounded-3xl border p-4 shadow-soft sm:p-5 md:p-6">
        <div className="student-home-hero__gradient pointer-events-none absolute inset-0" aria-hidden />
        <div className="student-home-hero__glow pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/20 blur-3xl" aria-hidden />
        <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center md:gap-6">
          <Avatar className="size-14 shrink-0 ring-2 ring-white/30 sm:size-16">
            <AvatarFallback className="bg-white/20 font-display text-base font-semibold text-white sm:text-lg">
              {getInitials(snap.profile.name, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-white/75">
              {studentGreeting()}
            </p>
            <h2 className="mt-0.5 font-display text-xl font-semibold leading-snug break-words text-white sm:text-2xl md:text-3xl">
              {firstName}
            </h2>
            <p className="mt-1 text-sm text-white/85">
              Welcome back · Today, {today}
            </p>
            <p className="mt-0.5 text-xs text-white/75 sm:text-sm">
              Class {snap.profile.class} · Section {snap.profile.section} · Roll{" "}
              {snap.profile.rollNo}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="border-white/25 bg-white/15 text-white backdrop-blur-sm"
              >
                Attendance {monthSummary.attendancePct}%
              </Badge>
              <Badge
                variant="outline"
                className="border-white/25 bg-white/15 text-white backdrop-blur-sm"
              >
                {todayClasses.length} class{todayClasses.length === 1 ? "" : "es"} today
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
        </div>
      </div>

      <DashboardLayoutProvider
        storageKey={`connect.student.${activeInstituteId ?? "default"}`}
        widgets={STUDENT_HOME_WIDGETS}
      >
        <div className="min-w-0 space-y-6">
        <DashboardCustomizeBar />
        <DashboardWidgets
          render={(id) => {
            if (id === "stats") {
              return (
                <div className="grid min-w-0 grid-cols-2 items-stretch gap-2 sm:grid-cols-4 sm:gap-2.5">
                  {STAT_CARDS.map((card) => {
                    const selected = isStudentRouteActive(pathname, card.to);
                    const value =
                      card.valueKey === "attendance"
                        ? `${monthSummary.attendancePct}%`
                        : card.valueKey === "score"
                          ? publishedCard
                            ? `${publishedCard.percentage}%`
                            : "84%"
                          : card.valueKey === "exams"
                            ? String(upcomingExamCount)
                            : String(snap.certificates.length);
                    const nextExam = apiUpcomingExams?.[0] ?? snap.exams[0];
                    const hint =
                      card.valueKey === "score" && publishedCard
                        ? `${publishedCard.grade} grade`
                        : card.valueKey === "exams" && nextExam
                          ? `Next: ${"subject" in nextExam ? nextExam.subject : nextExam.examName}`
                          : card.hint;

                    return (
                      <Link key={card.to} to={card.to} className="block h-full min-h-0">
                        <StatCard
                          icon={card.icon}
                          label={card.label}
                          value={value}
                          tone={card.tone}
                          hint={hint}
                          moduleColor={card.moduleColor}
                          selected={selected}
                          compact
                        />
                      </Link>
                    );
                  })}
                </div>
              );
            }

            if (id === "attendance") {
              return (
                <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card title="Today's Attendance" link="/attendance">
                    <p className="text-xs text-muted-foreground">{formatDisplayDate(todayIso)}</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {labelForAttendanceStatus(todayStatus === "unknown" ? "unknown" : todayStatus)}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-3 w-fit",
                        todayStatus === "present" && "border-success/40 text-success",
                        todayStatus === "absent" && "border-destructive/40 text-destructive",
                        todayStatus === "leave" && "border-warning/40 text-warning-foreground",
                      )}
                    >
                      {fromRegister.fromRegister ? "From register" : todayStatus}
                    </Badge>
                  </Card>

                  <Card title="Attendance history" link="/attendance">
                    <p className="text-sm text-muted-foreground">
                      {monthSummary.monthLabel} · {monthSummary.attendancePct}% · {monthSummary.present}P /{" "}
                      {monthSummary.absent}A · {monthSummary.workingDays} working days
                    </p>
                    {recentHistory.length ? (
                      <ul className="mt-3 space-y-2">
                        {recentHistory.map((d) => {
                          const iso = isoFromParts(now.getFullYear(), now.getMonth(), d.day);
                          return (
                            <li
                              key={iso}
                              className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
                            >
                              <span className="text-muted-foreground">{formatDisplayDate(iso)}</span>
                              <span className="font-medium">{labelForAttendanceStatus(d.status)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <EmptyState
                        icon={ClipboardCheck}
                        title="No history yet"
                        description="Past attendance days will show here."
                        className="py-6"
                        moduleColor={STUDENT_MODULE_COLORS.green}
                      />
                    )}
                  </Card>
                </div>
              );
            }

            if (id === "quick-actions") {
              return (
                <Card title="Quick Actions" compact>
                  <div className="grid min-w-0 grid-cols-2 items-stretch gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
                    {QUICK_LINKS.map((q) => {
                      const selected = isStudentRouteActive(pathname, q.to);
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
                </Card>
              );
            }

            if (id === "activity") {
              return (
                <div className="grid min-w-0 grid-cols-1 gap-4 items-stretch lg:grid-cols-3">
                  <Card title="Recent notifications" link="/notifications">
                    {recentNotifications.length ? (
                      <div className="min-w-0 flex-1 space-y-2">
                        {recentNotifications.map((n) => (
                          <div
                            key={n.id}
                            className={cn(
                              "student-list-row flex min-w-0 gap-2 rounded-xl border p-3",
                              !n.unread && "border-border",
                            )}
                            style={
                              n.unread
                                ? {
                                    borderColor: `${STUDENT_NOTIFICATION_COLOR.primary}4D`,
                                    backgroundColor: `${STUDENT_NOTIFICATION_COLOR.primary}08`,
                                  }
                                : undefined
                            }
                          >
                            <Bell
                              className="mt-0.5 size-4 shrink-0"
                              style={{ color: STUDENT_NOTIFICATION_COLOR.primary }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{n.title}</div>
                              <div className="truncate text-xs text-muted-foreground">{n.desc}</div>
                            </div>
                            {n.unread && (
                              <span
                                className="size-1.5 shrink-0 rounded-full mt-2"
                                style={{ backgroundColor: STUDENT_NOTIFICATION_COLOR.primary }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={Bell}
                        title="No notifications"
                        description="You're all caught up. New alerts will appear here."
                        className="py-8"
                        moduleColor={STUDENT_NOTIFICATION_COLOR}
                      />
                    )}
                  </Card>

                  <Card title="Today's classes" link="/timetable">
                    {todayClasses.length ? (
                      <div className="min-w-0 divide-y divide-border">
                        {todayClasses.slice(0, 4).map((c) => (
                          <div
                            key={c.time}
                            className="flex min-w-0 items-center gap-2 py-3 first:pt-0 sm:gap-3"
                          >
                            <div className="w-[3.75rem] shrink-0 text-xs font-medium tabular-nums text-muted-foreground sm:w-20">
                              <span className="block truncate">{c.time.split(" – ")[0]}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{c.subject}</div>
                              <div className="truncate text-xs text-muted-foreground">{c.teacher}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={Calendar}
                        title="No classes today"
                        description="Enjoy your day off or check another day on the timetable."
                        className="py-8"
                        moduleColor={STUDENT_MODULE_COLORS.blue}
                      />
                    )}
                  </Card>

                  <Card title="Upcoming events">
                    {upcomingEvents.length ? (
                      <div className="min-w-0 flex-1 space-y-2">
                        {upcomingEvents.map((e) => (
                          <div key={e.id} className="student-list-row rounded-xl border border-border p-3.5">
                            <div className="text-xs text-muted-foreground">
                              {apiUpcomingEvents
                                ? formatEventDate((e as ConnectEventItem).date)
                                : (e as { date: string }).date}
                            </div>
                            <div className="mt-0.5 font-medium leading-snug">{e.title}</div>
                            {"venue" in e && e.venue ? (
                              <div className="mt-0.5 text-xs text-muted-foreground">{e.venue}</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={Calendar}
                        title="No upcoming events"
                        description="School events and activities will show up here."
                        className="py-8"
                        moduleColor={STUDENT_MODULE_COLORS.sky}
                      />
                    )}
                  </Card>
                </div>
              );
            }

            if (id === "achievements") {
              return (
                <Card title="Recent achievements" link="/achievements">
                  {recentAch.length ? (
                    <div className="grid min-w-0 auto-rows-fr grid-cols-1 items-stretch gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                      {recentAch.map((a) => (
                        <AchievementBadge key={a.id} a={a} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Trophy}
                      title="No achievements yet"
                      description="Complete goals and participate in activities to earn badges."
                      className="py-8"
                      moduleColor={STUDENT_MODULE_COLORS.gold}
                    />
                  )}
                </Card>
              );
            }

            if (id === "academics") {
              return (
                <div className="space-y-6">
                  <div className="grid min-w-0 grid-cols-1 gap-4 items-stretch lg:grid-cols-2">
                    <Card title="Performance trend" link="/academic-history">
                      <div className="h-40 w-full min-w-0 max-w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={snap.trend}>
                            <defs>
                              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="oklch(0.55 0.22 260)" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="oklch(0.55 0.22 260)" stopOpacity={0} />
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
                              stroke="oklch(0.55 0.22 260)"
                              strokeWidth={2.5}
                              fill="url(#g)"
                              isAnimationActive={!prefersReducedMotion()}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <div
                        className={cn(
                          "mt-2 flex min-w-0 items-center gap-2 text-xs font-medium",
                          trendDelta >= 0 ? "text-success" : "text-destructive",
                        )}
                      >
                        <TrendingUp className="size-3.5 shrink-0" />
                        <span className="min-w-0 break-words">
                          {trendDelta >= 0 ? "+" : ""}
                          {trendDelta} points across {snap.trend.length} terms
                        </span>
                      </div>
                    </Card>

                    <Card title="Focus subjects">
                      <div className="min-w-0 space-y-3">
                        {weak.map((p) => (
                          <div key={p.subject} className="min-w-0">
                            <div className="mb-1 flex min-w-0 items-baseline justify-between gap-2 text-sm">
                              <span className="min-w-0 truncate font-medium">{p.subject}</span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">{p.score}%</span>
                            </div>
                            <Progress value={p.score} className="h-2" />
                          </div>
                        ))}
                        <p className="pt-1 text-xs text-muted-foreground">
                          Suggested: 30 min daily revision + 1 mock test/week.
                        </p>
                      </div>
                    </Card>
                  </div>

                  <Card title="Upcoming exams">
                    {upcomingExams.length ? (
                      <div className="grid min-w-0 auto-rows-fr grid-cols-1 items-stretch gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                        {upcomingExams.map((e) => (
                          <div
                            key={e.id}
                            className="student-list-row flex min-h-0 min-w-0 flex-col rounded-xl border border-border p-3.5 sm:p-4"
                          >
                            <div className="text-xs text-muted-foreground">{e.date}</div>
                            <div className="mt-1 font-medium leading-snug break-words line-clamp-2">
                              {e.subject}
                            </div>
                            <div className="mt-1 text-xs leading-snug text-muted-foreground break-words line-clamp-2">
                              {e.duration} • {e.room}
                            </div>
                            <Badge variant="outline" className="mt-2 w-fit text-xs">
                              Scheduled
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={BookOpen}
                        title="No exams scheduled"
                        description="Exam dates will appear here when announced by your school."
                        className="py-8"
                        moduleColor={STUDENT_MODULE_COLORS.red}
                      />
                    )}
                  </Card>
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
}

function Card({
  title,
  link,
  children,
  compact = false,
}: {
  title: string;
  link?: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 max-w-full flex-col rounded-2xl border border-border bg-card shadow-soft",
        compact ? "p-3 sm:p-4" : "p-3 sm:p-4 md:p-5",
      )}
    >
      <div className={cn("flex min-w-0 items-start justify-between gap-2 sm:items-center", compact ? "mb-2" : "mb-3")}>
        <h3 className="min-w-0 flex-1 font-semibold leading-snug line-clamp-2 break-words">
          {title}
        </h3>
        {link && (
          <Link to={link} className="student-section-link whitespace-nowrap">
            View all <ArrowRight className="size-3 shrink-0" aria-hidden />
          </Link>
        )}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
