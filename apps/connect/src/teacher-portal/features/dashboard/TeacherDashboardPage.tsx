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
  MessageSquare,
  ShieldAlert,
  PenLine,
  FileText,
  UserX,
  TrendingDown,
  AlertTriangle,
  CalendarOff,
  Wallet,
  Bell,
} from "lucide-react";
import { Badge, cn } from "@lumenx/ui";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { StatCard, QuickActionLink } from "@/teacher-portal/shared/ui/StatCard";
import { TimetableCard } from "@/teacher-portal/shared/ui/TimetableCard";
import { NotificationCard } from "@/teacher-portal/shared/ui/NotificationCard";
import { TeacherLeaveDashboardPanel } from "@/components/app/leave/TeacherLeaveDashboardPanel";
import { getTodayDayName, teacherRepository } from "@/lib/teacher/repositories";
import type { StudentAttentionItem } from "@/lib/teacher/types";

export function TeacherDashboardPage() {
  const portal = useTeacherPortal();
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
      <section className="rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-glow md:p-8">
        <p className="teacher-stat-label opacity-80">{greeting}</p>
        <h1 className="font-display mt-1 text-xl font-semibold sm:text-2xl md:text-3xl">
          {profile?.name?.split(" ")[0] ?? "Teacher"}, you have {dashboard.todayClasses.length}{" "}
          {dashboard.todayClasses.length === 1 ? "class" : "classes"} today.
        </h1>
        <p className="mt-2 max-w-lg text-xs opacity-85 sm:text-sm">
          Subject Teacher home — class messages and notifications only. Switch role in Settings for
          activity coordinator items.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quick view
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
          <StatCard
            icon={Calendar}
            label="Today's classes"
            value={String(dashboard.todayClasses.length)}
            hint={`${dashboard.weekClassCount} this week`}
            tone="primary"
          />
          <StatCard
            icon={ClipboardCheck}
            label="Attendance pending"
            value={String(dashboard.attendancePending.length)}
            hint="Classes not marked"
            tone={dashboard.attendancePending.length ? "alert" : "default"}
          />
          <StatCard
            icon={BookOpen}
            label="Pending assignments"
            value={String(dashboard.pendingHomework.length)}
            hint="Drafts & low submission"
            tone={dashboard.pendingHomework.length ? "alert" : "default"}
          />
          <StatCard
            icon={GraduationCap}
            label="Marks pending"
            value={String(dashboard.pendingMarks.length)}
            hint="Drafts to publish"
            tone={dashboard.pendingMarks.length ? "alert" : "default"}
          />
          <StatCard
            icon={FileText}
            label="Upcoming exams"
            value={String(dashboard.upcomingExams.length)}
          />
          <StatCard
            icon={CalendarDays}
            label="Upcoming events"
            value={String(dashboard.upcomingEvents.length)}
          />
          <StatCard
            icon={MessageSquare}
            label="Unread messages"
            value={String(dashboard.unreadMessages)}
            tone={dashboard.unreadMessages ? "alert" : "default"}
          />
          <StatCard
            icon={UserX}
            label="Need attention"
            value={String(dashboard.studentsNeedingAttention.length)}
            hint="Students at risk"
            tone={dashboard.studentsNeedingAttention.length ? "alert" : "default"}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quick actions
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
          <QuickActionLink icon={ClipboardCheck} label="Attendance" to="/attendance" />
          <QuickActionLink icon={BookOpen} label="Assignments" to="/assignments" />
          <QuickActionLink icon={GraduationCap} label="Enter marks" to="/marks" />
          <QuickActionLink icon={Users} label="Students" to="/students" />
          <QuickActionLink icon={MessageSquare} label="Messages" to="/messages" />
          <QuickActionLink icon={PenLine} label="Remarks" to="/remarks" />
          <QuickActionLink icon={Calendar} label="Timetable" to="/timetable" />
          <QuickActionLink icon={CalendarOff} label="Leave" to="/leave" />
          <QuickActionLink icon={FileText} label="Exams" to="/exams" />
          <QuickActionLink icon={Wallet} label="Fees" to="/fees" />
          <QuickActionLink icon={Bell} label="Notifications" to="/notifications" />
          <QuickActionLink icon={CalendarDays} label="Events" to="/events" />
        </div>
      </section>

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
          <h2 className="mb-3 font-semibold">Today's attendance</h2>
          {dashboard.attendancePending.length ? (
            <ul className="space-y-2">
              {dashboard.attendancePending.map((a) => (
                <li key={a.classId}>
                  <Link
                    to="/attendance"
                    search={{ classId: a.classId }}
                    className="teacher-list-row flex items-center justify-between rounded-xl border border-warning/30 bg-warning/5 p-3.5 text-sm hover:bg-warning/10"
                  >
                    <span>{a.label}</span>
                    <Badge variant="outline" className="border-warning/40 text-warning-foreground">
                      Pending
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-success">All attendance marked for today.</p>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardList
          title="Pending assignments"
          linkTo="/assignments"
          linkLabel="View all"
          items={dashboard.pendingHomework.map((h) => ({
            key: h.assignmentId,
            primary: h.label,
            secondary: `${h.pendingCount} pending`,
          }))}
          empty="No pending assignments."
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
          empty="All marks published."
        />
      </div>

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

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Unread messages</h2>
            <Link to="/messages" className="teacher-section-link whitespace-nowrap">
              Open inbox
            </Link>
          </div>
          <p className="text-3xl font-display font-semibold tabular-nums">
            {dashboard.unreadMessages}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Messages waiting for your reply</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="size-4 text-primary" />
            <h2 className="font-semibold">Recent complaints</h2>
            <Link to="/complaints" className="teacher-section-link ml-auto whitespace-nowrap">
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {dashboard.recentComplaints.length ? (
              dashboard.recentComplaints.map((c) => (
                <li
                  key={c.id}
                  className="teacher-list-row flex items-center justify-between rounded-xl border border-border p-3.5 text-sm"
                >
                  <span className="truncate">{c.title}</span>
                  <Badge variant="outline" className="capitalize shrink-0">
                    {c.status.replace("_", " ")}
                  </Badge>
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">No open complaints.</li>
            )}
          </ul>
        </section>
      </div>

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
                  onMarkRead={(id) => void teacherRepository.markNotificationRead(id)}
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
