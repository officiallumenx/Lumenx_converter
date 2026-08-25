import { Link } from "@tanstack/react-router";
import { useEffect, useSyncExternalStore } from "react";
import {
  ClipboardCheck,
  GraduationCap,
  Calendar,
  CalendarDays,
  Users,
  ArrowRight,
  Megaphone,
  AlertCircle,
  BookOpen,
  NotebookPen,
  MessageSquare,
  PenLine,
  FileText,
  UserX,
  TrendingDown,
  AlertTriangle,
  Wallet,
  Bell,
} from "lucide-react";
import {
  Badge,
  cn,
  DashboardCustomizeBar,
  DashboardLayoutProvider,
  DashboardWidgets,
  type DashboardWidgetDef,
} from "@lumenx/ui";
import { useApp } from "@/lib/app-state";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { StatCard, QuickActionLink } from "@/teacher-portal/shared/ui/StatCard";
import { TimetableCard } from "@/teacher-portal/shared/ui/TimetableCard";
import { NotificationCard } from "@/teacher-portal/shared/ui/NotificationCard";
import { TeacherLeaveDashboardPanel } from "@/components/app/leave/TeacherLeaveDashboardPanel";
import { DiaryOverdueBanner } from "@/components/app/diary/DiaryBookPage";
import { getTodayDayName, teacherRepository } from "@/lib/teacher/repositories";
import type { StudentAttentionItem } from "@/lib/teacher/types";
import { STUDENT_MODULE_COLORS } from "@/lib/student/nav";
import { TEACHER_NAV } from "@/lib/teacher/nav";

const TEACHER_HOME_WIDGETS: DashboardWidgetDef[] = [
  { id: "quick-view", label: "Quick view" },
  { id: "quick-actions", label: "Quick Actions" },
  { id: "today", label: "Today" },
  { id: "pending", label: "Pending work" },
  { id: "schedule", label: "Schedule & leave" },
  { id: "insights", label: "Class insights" },
  { id: "updates", label: "Updates" },
];

function teacherModuleColor(to: string) {
  return TEACHER_NAV.find((n) => n.to === to)?.moduleColor ?? STUDENT_MODULE_COLORS.blue;
}

export function TeacherDashboardPage() {
  const portal = useTeacherPortal();
  const { activeInstituteId } = useApp();
  // Live notifications so the dashboard reflects reads/new announcements immediately,
  // rather than the frozen seed captured in the dashboard snapshot.
  const liveNotifications = useSyncExternalStore(
    teacherRepository.subscribeNotifications,
    teacherRepository.getNotificationsSnapshot,
    teacherRepository.getNotificationsSnapshot,
  );

  const refresh = portal.isTeacher ? portal.refresh : undefined;
  // Recompute the dashboard from live stores whenever it is (re)entered, so mutations made
  // on other teacher screens (assignments, exams, messages, complaints) are reflected.
  useEffect(() => {
    refresh?.();
  }, [refresh]);

  if (!portal.isTeacher) return null;

  if (portal.isLoading || !portal.dashboard) {
    return <PageSkeleton rows={5} />;
  }

  const { dashboard, profile } = portal;
  const greeting = getGreeting();

  return (
    <div className="min-w-0 space-y-6">
      <section className="student-home-hero relative overflow-hidden rounded-3xl border p-4 shadow-soft sm:p-5 md:p-6">
        <div className="student-home-hero__gradient pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="student-home-hero__glow pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/20 blur-3xl"
          aria-hidden
        />
        <div className="relative min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-white/75">{greeting}</p>
          <h1 className="mt-0.5 font-display text-xl font-semibold leading-snug text-white sm:text-2xl md:text-3xl">
            {profile?.name?.split(" ")[0] ?? "Teacher"}, you have {dashboard.todayClasses.length}{" "}
            {dashboard.todayClasses.length === 1 ? "class" : "classes"} today.
          </h1>
          <p className="mt-2 max-w-lg text-xs text-white/85 sm:text-sm">
            Subject Teacher home — class messages and notifications only. Switch role in Settings for
            activity coordinator items.
          </p>
        </div>
      </section>

      <DiaryOverdueBanner scope="subject" href="/diary" />

      <DashboardLayoutProvider
        storageKey={`connect.teacher.${activeInstituteId ?? "default"}`}
        widgets={TEACHER_HOME_WIDGETS}
      >
        <div className="min-w-0 space-y-6">
        <DashboardCustomizeBar />
        <DashboardWidgets
          render={(id) => {
            if (id === "quick-view") {
              return (
                <section>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Quick view
                  </h2>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
                    <StatCard
                      icon={Calendar}
                      label="Today's classes"
                      value={String(dashboard.todayClasses.length)}
                      hint={`${dashboard.weekClassCount} this week`}
                      moduleColor={STUDENT_MODULE_COLORS.blue}
                    />
                    <StatCard
                      icon={ClipboardCheck}
                      label="Pending Attendance"
                      value={String(dashboard.attendancePending.length)}
                      hint="Not marked today"
                      moduleColor={STUDENT_MODULE_COLORS.green}
                    />
                    <StatCard
                      icon={ClipboardCheck}
                      label="Completed Attendance"
                      value={String(dashboard.attendanceCompleted.length)}
                      hint="Submitted today"
                      moduleColor={STUDENT_MODULE_COLORS.teal}
                    />
                    <StatCard
                      icon={Users}
                      label="Remaining Classes"
                      value={String(dashboard.classesRemaining)}
                      hint="Still to mark"
                      moduleColor={STUDENT_MODULE_COLORS.amber}
                    />
                    <StatCard
                      icon={BookOpen}
                      label="Pending homework"
                      value={String(dashboard.pendingHomework.length)}
                      hint="Drafts & low submission"
                      moduleColor={STUDENT_MODULE_COLORS.purple}
                    />
                    <StatCard
                      icon={GraduationCap}
                      label="Marks pending"
                      value={String(dashboard.pendingMarks.length)}
                      hint="Drafts to submit"
                      moduleColor={STUDENT_MODULE_COLORS.indigo}
                    />
                    <StatCard
                      icon={FileText}
                      label="Upcoming exams"
                      value={String(dashboard.upcomingExams.length)}
                      moduleColor={STUDENT_MODULE_COLORS.red}
                    />
                    <StatCard
                      icon={UserX}
                      label="Need attention"
                      value={String(dashboard.studentsNeedingAttention.length)}
                      hint="Students at risk"
                      moduleColor={STUDENT_MODULE_COLORS.scarlet}
                    />
                  </div>
                </section>
              );
            }

            if (id === "quick-actions") {
              return (
                <section>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Quick actions
                  </h2>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                    <QuickActionLink
                      icon={ClipboardCheck}
                      label="Attendance"
                      to="/attendance"
                      moduleColor={teacherModuleColor("/attendance")}
                    />
                    <QuickActionLink
                      icon={BookOpen}
                      label="Homework"
                      to="/assignments"
                      moduleColor={teacherModuleColor("/assignments")}
                    />
                    <QuickActionLink
                      icon={GraduationCap}
                      label="Enter marks"
                      to="/marks"
                      moduleColor={teacherModuleColor("/marks")}
                    />
                    <QuickActionLink
                      icon={Users}
                      label="Students"
                      to="/students"
                      moduleColor={teacherModuleColor("/students")}
                    />
                    <QuickActionLink
                      icon={MessageSquare}
                      label="Messages"
                      to="/messages"
                      moduleColor={teacherModuleColor("/messages")}
                    />
                    <QuickActionLink
                      icon={PenLine}
                      label="Remarks"
                      to="/remarks"
                      moduleColor={teacherModuleColor("/remarks")}
                    />
                    <QuickActionLink
                      icon={Calendar}
                      label="Timetable"
                      to="/timetable"
                      moduleColor={teacherModuleColor("/timetable")}
                    />
                    <QuickActionLink
                      icon={NotebookPen}
                      label="Diary Book"
                      to="/diary"
                      moduleColor={teacherModuleColor("/diary")}
                    />
                    <QuickActionLink
                      icon={FileText}
                      label="Exams"
                      to="/exams"
                      moduleColor={teacherModuleColor("/exams")}
                    />
                    <QuickActionLink
                      icon={Wallet}
                      label="Fees"
                      to="/fees"
                      moduleColor={teacherModuleColor("/fees")}
                    />
                    <QuickActionLink
                      icon={Bell}
                      label="Notifications"
                      to="/notifications"
                      moduleColor={teacherModuleColor("/notifications")}
                    />
                    <QuickActionLink
                      icon={CalendarDays}
                      label="Events"
                      to="/events"
                      moduleColor={teacherModuleColor("/events")}
                    />
                  </div>
                </section>
              );
            }

            if (id === "today") {
              return (
                <div className="grid gap-4 lg:grid-cols-3">
                  <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 lg:col-span-2">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h2 className="font-semibold">Today, {getTodayDayName()}</h2>
                      <Link to="/timetable" className="teacher-section-link whitespace-nowrap">
                        Full timetable <ArrowRight className="size-3 shrink-0" aria-hidden />
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {dashboard.todayClasses.length ? (
                        dashboard.todayClasses.map((slot) => (
                          <TimetableCard key={slot.id} slot={slot} highlighted />
                        ))
                      ) : (
                        <p className="teacher-empty-state py-8">No classes scheduled today.</p>
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h2 className="font-semibold">Today's attendance</h2>
                      <Link to="/attendance" className="teacher-section-link whitespace-nowrap">
                        Open <ArrowRight className="size-3 shrink-0" aria-hidden />
                      </Link>
                    </div>
                    <p className="mb-3 text-xs text-muted-foreground">
                      {dashboard.attendanceCompleted.length} completed · {dashboard.classesRemaining} remaining
                    </p>
                    {dashboard.attendancePending.length || dashboard.attendanceCompleted.length ? (
                      <ul className="space-y-2">
                        {dashboard.attendancePending.map((a) => (
                          <li key={`pending-${a.classId}`}>
                            <Link
                              to="/attendance"
                              search={{ classId: a.classId }}
                              className="teacher-list-row flex items-center justify-between rounded-xl border border-warning/30 bg-warning/5 p-3.5 text-sm hover:bg-warning/10"
                            >
                              <span className="min-w-0 truncate">{a.label}</span>
                              <Badge variant="outline" className="shrink-0 border-warning/40 text-warning-foreground">
                                Pending
                              </Badge>
                            </Link>
                          </li>
                        ))}
                        {dashboard.attendanceCompleted.map((a) => (
                          <li key={`done-${a.classId}`}>
                            <Link
                              to="/attendance"
                              search={{ classId: a.classId }}
                              className="teacher-list-row flex items-center justify-between rounded-xl border border-success/30 bg-success/5 p-3.5 text-sm hover:bg-success/10"
                            >
                              <span className="min-w-0 truncate">{a.label}</span>
                              <Badge variant="outline" className="shrink-0 border-success/40 text-success">
                                Done
                              </Badge>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No classes to mark today.</p>
                    )}
                  </section>
                </div>
              );
            }

            if (id === "pending") {
              return (
                <div className="grid gap-4 lg:grid-cols-2">
                  <DashboardList
                    title="Pending homework"
                    linkTo="/assignments"
                    linkLabel="View all"
                    items={dashboard.pendingHomework.map((h) => ({
                      key: h.assignmentId,
                      primary: h.label,
                      secondary: `${h.pendingCount} pending`,
                    }))}
                    empty="No pending homework."
                  />
                  <DashboardList
                    title="Pending marks entry"
                    linkTo="/marks"
                    linkLabel="Enter marks"
                    items={dashboard.pendingMarks.map((m) => ({
                      key: m.examId,
                      primary: m.label,
                      secondary: `${m.count} students`,
                    }))}
                    empty="All marks submitted."
                  />
                </div>
              );
            }

            if (id === "schedule") {
              return (
                <div className="space-y-6">
                  <TeacherLeaveDashboardPanel />

                  <div className="grid gap-4 lg:grid-cols-2">
                    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <AlertCircle className="size-4 text-primary" />
                        <h2 className="font-semibold">Upcoming exams</h2>
                        <Link to="/exams" className="teacher-section-link ml-auto whitespace-nowrap">
                          Manage
                        </Link>
                      </div>
                      <ul className="space-y-2">
                        {dashboard.upcomingExams.length ? (
                          dashboard.upcomingExams.map((e) => (
                            <li key={e.id} className="teacher-list-row rounded-xl border border-border p-3.5 text-sm">
                              <div className="font-medium">{e.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {e.date} · {e.subject} · Class {e.classLabel}
                              </div>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-muted-foreground">No upcoming exams.</li>
                        )}
                      </ul>
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <CalendarDays className="size-4 text-primary" />
                        <h2 className="font-semibold">Upcoming events</h2>
                        <Link to="/events" className="teacher-section-link ml-auto whitespace-nowrap">
                          View all
                        </Link>
                      </div>
                      <ul className="space-y-2">
                        {dashboard.upcomingEvents.length ? (
                          dashboard.upcomingEvents.map((e) => (
                            <li key={e.id} className="teacher-list-row rounded-xl border border-border p-3.5 text-sm">
                              <div className="font-medium">{e.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {e.date} · {e.time} · {e.location}
                              </div>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-muted-foreground">No events scheduled.</li>
                        )}
                      </ul>
                    </section>
                  </div>
                </div>
              );
            }

            if (id === "insights") {
              return (
                <div className="space-y-6">
                  <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="font-semibold">Class performance summary</h2>
                      <Link to="/classes" className="teacher-section-link whitespace-nowrap">
                        My classes
                      </Link>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {dashboard.classPerformance.map((c) => (
                        <div key={c.classId} className="rounded-xl border border-border p-3">
                          <div className="font-medium text-sm">Class {c.label}</div>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                            <div>
                              <div className="text-muted-foreground">Attendance</div>
                              <div className="font-semibold text-success">{c.attendance}%</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Homework</div>
                              <div className="font-semibold text-primary">{c.homework}%</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Avg score</div>
                              <div className="font-semibold">{c.avgScore}%</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-warning/30 bg-warning/5 p-4 shadow-soft sm:p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <AlertTriangle className="size-4 text-warning-foreground" />
                      <h2 className="font-semibold">Students needing attention</h2>
                      <Link to="/students" className="teacher-section-link ml-auto whitespace-nowrap">
                        View all students
                      </Link>
                    </div>
                    {dashboard.studentsNeedingAttention.length ? (
                      <ul className="space-y-2">
                        {dashboard.studentsNeedingAttention.map((s) => (
                          <AttentionItem key={s.studentId} item={s} />
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">All students are on track.</p>
                    )}
                  </section>
                </div>
              );
            }

            if (id === "updates") {
              return (
                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="font-semibold">Recent notifications</h2>
                      <Link to="/notifications" className="teacher-section-link whitespace-nowrap">
                        View all
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {liveNotifications
                        .filter((n) => n.unread)
                        .slice(0, 3)
                        .map((n) => (
                          <NotificationCard
                            key={n.id}
                            notification={n}
                            onMarkRead={(nid) => void teacherRepository.markNotificationRead(nid)}
                          />
                        ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <Megaphone className="size-4 text-primary" />
                      <h2 className="font-semibold">Announcements</h2>
                    </div>
                    <ul className="space-y-3">
                      {dashboard.announcements.map((a) => (
                        <li key={a.id} className="rounded-xl border border-border p-3">
                          <div className="font-medium text-sm">{a.title}</div>
                          <p className="mt-1 text-xs text-muted-foreground">{a.body}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{a.date}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
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

const ATTENTION_ICON: Record<StudentAttentionItem["reason"], typeof AlertTriangle> = {
  low_attendance: UserX,
  low_marks: TrendingDown,
  missing_assignments: AlertCircle,
  behaviour: AlertTriangle,
};

const ATTENTION_STYLE: Record<StudentAttentionItem["reason"], string> = {
  low_attendance: "border-destructive/20 bg-destructive/5",
  low_marks: "border-warning/30 bg-warning/5",
  missing_assignments: "border-primary/20 bg-primary/5",
  behaviour: "border-destructive/20 bg-destructive/5",
};

function AttentionItem({ item }: { item: StudentAttentionItem }) {
  const Icon = ATTENTION_ICON[item.reason];
  return (
    <li
      className={cn(
        "teacher-list-row flex items-start gap-3 rounded-xl border p-3.5 text-sm",
        ATTENTION_STYLE[item.reason],
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
      <div className="min-w-0 flex-1">
        <span className="font-medium">{item.studentName}</span>
        <span className="ml-2 text-xs text-muted-foreground">{item.classLabel}</span>
        <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
      </div>
    </li>
  );
}

function DashboardList({
  title,
  linkTo,
  linkLabel,
  items,
  empty,
}: {
  title: string;
  linkTo: string;
  linkLabel: string;
  items: { key: string; primary: string; secondary: string }[];
  empty: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <Link to={linkTo} className="teacher-section-link whitespace-nowrap">
          {linkLabel}
        </Link>
      </div>
      <ul className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <li
              key={item.key}
              className="teacher-list-row flex items-center justify-between rounded-xl border border-border p-3.5 text-sm"
            >
              <span className="min-w-0 truncate">{item.primary}</span>
              <span className="shrink-0 text-muted-foreground">{item.secondary}</span>
            </li>
          ))
        ) : (
          <li className="text-sm text-muted-foreground">{empty}</li>
        )}
      </ul>
    </section>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
