import { Link } from "@tanstack/react-router";
import { useMemo, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import {
  Trophy,
  Sparkles,
  ClipboardCheck,
  Dumbbell,
  MessageSquare,
  Bell,
  ChevronRight,
  NotebookPen,
  CalendarDays,
} from "lucide-react";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { ACTIVITY_WORKSPACE_BASE } from "@/activity-workspace/core/routes";
import { workspaceCommunicationRepository } from "@/lib/activity/workspace-communication";
import {
  workspaceCalendarRepository,
  WORKSPACE_CALENDAR_CATEGORY_LABELS,
  type WorkspaceCalendarEntry,
} from "@/lib/activity/workspace-calendar";
import { ActivityPageShell } from "@/activity-workspace/shared/ui/ActivityPageShell";
import { ActivityEmptyState } from "@/activity-workspace/shared/ui/ActivityEmptyState";
import { DiaryOverdueBanner } from "@/components/app/diary/DiaryBookPage";
import { ACTIVITY_MODULE_COLORS } from "@/activity-workspace/core/nav";
import {
  studentModuleCardStyle,
  studentModuleLightChip,
} from "@/lib/student/nav";
import { cn } from "@lumenx/ui";
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatEntryWhen(e: WorkspaceCalendarEntry) {
  const parts = [e.startTime, e.venue, e.unitLabel].filter(Boolean);
  return parts.join(" · ") || WORKSPACE_CALENDAR_CATEGORY_LABELS[e.category];
}

function formatDayLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const QUICK_ACTIONS = [
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/practice`,
    label: "Practice",
    hint: "Assign",
    icon: Dumbbell,
    moduleColor: ACTIVITY_MODULE_COLORS.practice,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/attendance`,
    label: "Attendance",
    hint: "Mark",
    icon: ClipboardCheck,
    moduleColor: ACTIVITY_MODULE_COLORS.attendance,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/sports`,
    label: "Sports",
    hint: "Teams",
    icon: Trophy,
    moduleColor: ACTIVITY_MODULE_COLORS.sports,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/extra-curricular`,
    label: "ECA",
    hint: "Groups",
    icon: Sparkles,
    moduleColor: ACTIVITY_MODULE_COLORS["extra-curricular"],
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/calendar`,
    label: "Calendar",
    hint: "Schedule",
    icon: CalendarDays,
    moduleColor: ACTIVITY_MODULE_COLORS.calendar,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/diary`,
    label: "Diary Book",
    hint: "Today",
    icon: NotebookPen,
    moduleColor: ACTIVITY_MODULE_COLORS.diary,
  },
] as const;

/**
 * Activity Coordinator home — daily snapshot from existing calendar + communication stores.
 * No new business logic; filters existing repository snapshots only.
 */
export function ActivityDashboardPage() {
  const teacherPortal = useTeacherPortal();
  const today = useMemo(() => todayIso(), []);

  const calendar = useSyncExternalStore(
    workspaceCalendarRepository.subscribe,
    workspaceCalendarRepository.getSnapshot,
    workspaceCalendarRepository.getSnapshot,
  );
  const comms = useSyncExternalStore(
    workspaceCommunicationRepository.subscribe,
    workspaceCommunicationRepository.getSnapshot,
    workspaceCommunicationRepository.getSnapshot,
  );

  const todaysPractice = useMemo(
    () =>
      calendar
        .filter((e) => e.date === today && e.category === "practice")
        .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")),
    [calendar, today],
  );

  const todaysActivities = useMemo(
    () =>
      calendar
        .filter(
          (e) =>
            e.date === today &&
            (e.category === "sports" || e.category === "extra-curricular"),
        )
        .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")),
    [calendar, today],
  );

  /** Units with practice/activity today — prompt to mark attendance (links only). */
  const pendingAttendance = useMemo(() => {
    const seen = new Set<string>();
    const rows: { key: string; label: string; hint: string }[] = [];
    for (const e of [...todaysPractice, ...todaysActivities]) {
      const key = e.unitId || e.unitLabel || e.id;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        key,
        label: e.unitLabel || e.title,
        hint:
          e.category === "practice"
            ? "Practice today"
            : WORKSPACE_CALENDAR_CATEGORY_LABELS[e.category],
      });
    }
    return rows;
  }, [todaysPractice, todaysActivities]);

  const recentMessages = useMemo(
    () => comms.filter((i) => i.kind === "message").slice(0, 4),
    [comms],
  );

  const upcomingProgrammes = useMemo(
    () =>
      calendar
        .filter((e) => e.category === "programme" && e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 4),
    [calendar, today],
  );

  const unreadNotifications = useMemo(
    () => comms.filter((i) => i.kind === "notification" && i.unread).length,
    [comms],
  );

  if (!teacherPortal.isTeacher) return null;

  const coordinatorName = teacherPortal.profile?.name?.split(" ")[0] ?? "Coordinator";

  return (
    <ActivityPageShell>
      <section className="student-home-hero relative overflow-hidden rounded-3xl border p-4 shadow-soft sm:p-5 md:p-6">
        <div className="student-home-hero__gradient pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="student-home-hero__glow pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/20 blur-3xl"
          aria-hidden
        />
        <div className="relative min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-white/75">{getGreeting()}</p>
          <h1 className="mt-0.5 font-display text-xl font-semibold leading-snug text-white sm:text-2xl">
            {coordinatorName}
          </h1>
          <p className="mt-1.5 max-w-md text-xs text-white/85 sm:text-sm">
            Today ·{" "}
            {new Date(`${today}T12:00:00`).toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
      </section>

      <DiaryOverdueBanner scope="activity" href={`${ACTIVITY_WORKSPACE_BASE}/diary`} />

      <section>
        <h2 className="activity-stat-label mb-3">Quick actions</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="activity-quick-link text-foreground"
              style={studentModuleCardStyle(a.moduleColor) as CSSProperties}
            >
              <span
                className="grid size-8 place-items-center rounded-lg"
                style={{
                  color: a.moduleColor.primary,
                  backgroundColor: studentModuleLightChip(a.moduleColor),
                }}
              >
                <a.icon className="size-4" aria-hidden />
              </span>
              <span className="text-sm font-medium leading-tight">{a.label}</span>
              <span className="text-[10px] leading-tight text-muted-foreground">{a.hint}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel
          title="Today's practice"
          href={`${ACTIVITY_WORKSPACE_BASE}/practice`}
          linkLabel="Practice"
        >
          {todaysPractice.length === 0 ? (
            <ActivityEmptyState compact title="No practice scheduled for today." />
          ) : (
            <ul className="space-y-2">
              {todaysPractice.map((e) => (
                <EntryRow key={e.id} entry={e} />
              ))}
            </ul>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Today's activities"
          href={`${ACTIVITY_WORKSPACE_BASE}/calendar`}
          linkLabel="Calendar"
        >
          {todaysActivities.length === 0 ? (
            <ActivityEmptyState compact title="No sports or ECA activities today." />
          ) : (
            <ul className="space-y-2">
              {todaysActivities.map((e) => (
                <EntryRow key={e.id} entry={e} />
              ))}
            </ul>
          )}
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="Pending attendance"
        href={`${ACTIVITY_WORKSPACE_BASE}/attendance`}
        linkLabel="Open attendance"
      >
        {pendingAttendance.length === 0 ? (
          <ActivityEmptyState compact title="Nothing on today's schedule that needs a roll call." />
        ) : (
          <ul className="space-y-2">
            {pendingAttendance.map((row) => (
              <li key={row.key}>
                <Link
                  to={`${ACTIVITY_WORKSPACE_BASE}/attendance`}
                  className="activity-list-row flex min-h-12 items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-soft"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{row.label}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {row.hint} · tap to mark
                    </span>
                  </span>
                  <ClipboardCheck className="size-4 shrink-0 text-primary" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DashboardPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel
          title="Recent messages"
          href={`${ACTIVITY_WORKSPACE_BASE}/messages`}
          linkLabel="Messages"
        >
          {recentMessages.length === 0 ? (
            <ActivityEmptyState compact title="No messages sent yet." />
          ) : (
            <ul className="space-y-2">
              {recentMessages.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-soft"
                >
                  <p className="font-medium leading-snug">{m.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {m.audienceLabel}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Upcoming programmes"
          href={`${ACTIVITY_WORKSPACE_BASE}/calendar`}
          linkLabel="Calendar"
        >
          {upcomingProgrammes.length === 0 ? (
            <ActivityEmptyState compact title="No upcoming school programmes." />
          ) : (
            <ul className="space-y-2">
              {upcomingProgrammes.map((e) => (
                <li
                  key={e.id}
                  className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-soft"
                >
                  <p className="font-medium leading-snug">{e.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDayLabel(e.date)}
                    {e.startTime ? ` · ${e.startTime}` : ""}
                    {e.venue ? ` · ${e.venue}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          to={`${ACTIVITY_WORKSPACE_BASE}/messages`}
          className="activity-list-row flex min-h-12 items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 py-3 text-sm shadow-soft"
        >
          <MessageSquare className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 leading-snug">
            <span className="font-semibold tabular-nums">{recentMessages.length}</span>
            <span className="text-muted-foreground"> recent messages</span>
          </span>
        </Link>
        <Link
          to={`${ACTIVITY_WORKSPACE_BASE}/notifications`}
          className="activity-list-row flex min-h-12 items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 py-3 text-sm shadow-soft"
        >
          <Bell className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 leading-snug">
            <span className="font-semibold tabular-nums">{unreadNotifications}</span>
            <span className="text-muted-foreground"> unread alerts</span>
          </span>
        </Link>
      </div>
    </ActivityPageShell>
  );
}

function DashboardPanel({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="activity-panel">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <Link to={href} className="activity-section-link whitespace-nowrap">
          {linkLabel}
          <ChevronRight className="size-3.5 opacity-70" aria-hidden />
        </Link>
      </div>
      {children}
    </section>
  );
}

function EntryRow({ entry }: { entry: WorkspaceCalendarEntry }) {
  return (
    <li className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-soft">
      <span
        className={cn("mt-1.5 size-2 shrink-0 rounded-full", entry.colorClass)}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-medium leading-snug">{entry.title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{formatEntryWhen(entry)}</p>
      </div>
    </li>
  );
}

