import { Link } from "@tanstack/react-router";
import {
  ClipboardCheck,
  GraduationCap,
  Calendar,
  TrendingUp,
  ArrowRight,
  FileText,
  Bell,
  CreditCard,
  Trophy,
  BookOpen,
} from "lucide-react";
import { StatCard } from "@/components/app/StatCard";
import { days } from "@/lib/mock-data";
import { prefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { studentNotificationStore } from "@/lib/student/notification-store";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { Badge, cn, Progress } from "@lumenx/ui";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { AchievementBadge } from "@/components/app/motivation/AchievementBadge";
import { useSyncExternalStore } from "react";
import { PageSkeleton, EmptyState } from "@/student-portal/shared/ui";

const QUICK_LINKS = [
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/marks", label: "Marks", icon: GraduationCap },
  { to: "/timetable", label: "Timetable", icon: Calendar },
  { to: "/certificates", label: "Certificates", icon: FileText },
  { to: "/id-card", label: "ID Card", icon: CreditCard },
] as const;

export function StudentDashboardPage() {
  const portal = useStudentPortal();
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
  const publishedCard = snap.reportCards.find((r) => r.status === "published");
  const upcomingExams = snap.exams.slice(0, 3);
  const upcomingEvents = snap.schoolEvents.filter((e) => e.kind !== "holiday").slice(0, 3);
  const recentNotifications = notifications.slice(0, 4);

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-5 text-primary-foreground shadow-glow sm:p-6 md:p-8">
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex min-w-0 flex-col items-start justify-between gap-4 md:flex-row md:gap-6">
          <div className="min-w-0 max-w-full flex-1">
            <div className="student-stat-label opacity-80">Today, {today}</div>
            <h2 className="mt-1 font-display text-xl font-semibold leading-snug break-words sm:text-2xl md:text-3xl">
              Hi {snap.profile.name.split(" ")[0]}, welcome back.
            </h2>
            <p className="mt-2 max-w-full text-xs opacity-85 sm:max-w-md sm:text-sm">
              {publishedCard
                ? `Latest report card: ${publishedCard.percentage}% (${publishedCard.grade}). Keep up the momentum.`
                : "Check your marks and timetable for what's coming up this week."}
            </p>
          </div>
          <div className="hidden shrink-0 text-right md:block">
            <div className="font-display text-3xl font-bold sm:text-4xl md:text-5xl">
              {snap.profile.attendance}%
            </div>
            <div className="text-xs opacity-80">Attendance</div>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 auto-rows-fr grid-cols-2 items-stretch gap-2.5 sm:gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          icon={ClipboardCheck}
          label="Attendance"
          value={`${snap.profile.attendance}%`}
          tone="success"
          hint="Above class average"
        />
        <StatCard
          icon={GraduationCap}
          label="Avg Score"
          value={publishedCard ? `${publishedCard.percentage}%` : "84%"}
          tone="primary"
          hint={publishedCard ? `${publishedCard.grade} grade` : "+4% vs last term"}
        />
        <StatCard
          icon={BookOpen}
          label="Upcoming exams"
          value={String(snap.exams.length)}
          tone="warning"
          hint={snap.exams[0] ? `Next: ${snap.exams[0].subject}` : "None scheduled"}
        />
        <StatCard
          icon={Trophy}
          label="Certificates"
          value={String(snap.certificates.length)}
          tone="primary"
          hint="View & download"
        />
      </div>

      <Card title="Quick access">
        <div className="grid min-w-0 auto-rows-fr grid-cols-2 items-stretch gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {QUICK_LINKS.map((q) => (
            <Link key={q.to} to={q.to} className="student-quick-link">
              <q.icon className="size-5 shrink-0 text-primary" />
              <span className="text-sm font-medium leading-tight">{q.label}</span>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid min-w-0 grid-cols-1 gap-4 items-stretch lg:grid-cols-3">
        <Card title="Recent notifications" link="/notifications">
          {recentNotifications.length ? (
            <div className="min-w-0 flex-1 space-y-2">
              {recentNotifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "student-list-row flex min-w-0 gap-2 rounded-xl border p-3",
                    n.unread ? "border-primary/30 bg-primary/[0.03]" : "border-border",
                  )}
                >
                  <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{n.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{n.desc}</div>
                  </div>
                  {n.unread && <span className="size-1.5 shrink-0 rounded-full bg-primary mt-2" />}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Bell}
              title="No notifications"
              description="You're all caught up. New alerts will appear here."
              className="py-8"
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
            />
          )}
        </Card>

        <Card title="Upcoming events">
          {upcomingEvents.length ? (
            <div className="min-w-0 flex-1 space-y-2">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="student-list-row rounded-xl border border-border p-3.5">
                  <div className="text-xs text-muted-foreground">{e.date}</div>
                  <div className="mt-0.5 font-medium leading-snug">{e.title}</div>
                  {e.venue && <div className="mt-0.5 text-xs text-muted-foreground">{e.venue}</div>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="No upcoming events"
              description="School events and activities will show up here."
              className="py-8"
            />
          )}
        </Card>
      </div>

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
          />
        )}
      </Card>

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
          <div className="mt-2 flex min-w-0 items-center gap-2 text-xs font-medium text-success">
            <TrendingUp className="size-3.5 shrink-0" />
            <span className="min-w-0 break-words">+12 points across 5 terms</span>
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
          />
        )}
      </Card>
    </div>
  );
}

function Card({
  title,
  link,
  children,
}: {
  title: string;
  link?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-col rounded-2xl border border-border bg-card p-3 shadow-soft sm:p-4 md:p-5">
      <div className="mb-3 flex min-w-0 items-start justify-between gap-2 sm:items-center">
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
