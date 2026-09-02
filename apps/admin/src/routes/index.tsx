import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Pill, Button, PageStack } from "@lumenx/ui-admin";
import { IconChip } from "@/components/IconChip";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import { HomeBirthdaysCard } from "@/components/HomeBirthdaysCard";
import { HomeDiaryCard } from "@/components/HomeDiaryCard";
import { HomeQuickActionsCard } from "@/components/HomeQuickActionsCard";
import { useDemoProfile } from "@/lib/demo-profile-context";
import {
  loadAttendancePending,
  loadDiarySubmissionLogs,
  teachersWithPendingMarks,
} from "./home-data";
import { getMarkEntriesSnapshot, subscribeMarkEntries } from "@/lib/marks-entry-store";
import { loadPendingReviews, subscribePendingReviews } from "@/lib/pending-reviews";
import { buildAdminAttendanceDashboard } from "@lumenx/module-attendance";
import { listAttendanceReportSections } from "@/lib/attendance-report-demo";
import type { LucideIcon } from "lucide-react";
import {
  Users,
  ClipboardCheck,
  CalendarRange,
  CalendarDays,
  MessageSquareWarning,
  BookOpen,
  UserCheck,
  Briefcase,
  BookMarked,
  Siren,
  ArrowUpRight,
  ClipboardList,
  LayoutTemplate,
  Bus,
  Settings,
  Bell,
  Clock,
  BarChart3,
} from "lucide-react";
import { useMemo, useSyncExternalStore, useEffect } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { syncPendingReviewsComplaintsApi } from "@/lib/pending-reviews";
import { HomeApiSummaryPanel } from "@/components/home/HomeApiSummaryPanel";
import {
  DashboardCustomizeActions,
  DashboardLayoutProvider,
  DashboardWidgets,
  type DashboardWidgetDef,
} from "@lumenx/ui";
import {
  getActiveTransportEmergencyCount,
  subscribeTransportEmergencies,
} from "@lumenx/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Home — LumenX Admin" }] }),
  component: HomePage,
});

type AttentionItem = {
  id: string;
  label: string;
  detail: string;
  count: number;
  to: string;
  search?: Record<string, string>;
  tone: "danger" | "warning" | "info" | "neutral";
  icon: LucideIcon;
};

const SHORTCUTS = [
  { label: "Attendance", to: "/attendance", icon: ClipboardCheck },
  { label: M.homework, to: "/homework", icon: BookOpen },
  { label: M.diary, to: "/diary", icon: BookMarked },
  { label: "Timetable", to: "/timetable", icon: CalendarRange },
  { label: "Certificates", to: "/templates", icon: LayoutTemplate },
  { label: "Admissions", to: "/admissions", icon: UserCheck },
  { label: "Careers", to: "/careers", icon: Briefcase },
  { label: "Transport", to: "/transport", icon: Bus },
  { label: "Events", to: "/events", icon: CalendarDays },
  { label: "Alerts", to: "/alerts", icon: Bell },
  { label: "Accounts", to: "/accounts", icon: Users },
  { label: "Settings", to: "/settings", icon: Settings },
] as const;

const ADMIN_HOME_WIDGETS: DashboardWidgetDef[] = [
  { id: "birthdays", label: "Today's Birthdays" },
  { id: "diary", label: M.diary },
  { id: "attention", label: "Needs Attention" },
  { id: "attendance", label: M.attendanceReports },
  { id: "quick-actions", label: "Quick Actions" },
  { id: "pending-reviews", label: "Reviews" },
  { id: "shortcuts", label: "Shortcuts" },
];

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function HomeApiPage() {
  const instituteCtx = useInstituteContext();
  useEffect(() => {
    if (instituteCtx.status === "ready" && instituteCtx.activeInstituteId) {
      syncPendingReviewsComplaintsApi(instituteCtx.activeInstituteId);
    }
  }, [instituteCtx.status, instituteCtx.activeInstituteId]);
  const instituteLabel =
    instituteCtx.status === "ready" && instituteCtx.activeInstitute
      ? instituteCtx.activeInstitute.name
      : "Institute";
  return (
    <DashboardLayoutProvider storageKey="admin.home.api" widgets={[{ id: "summary", label: "Overview" }]}>
      <AppShell
        title="Home"
        subtitle={`What should I do today? · ${instituteLabel} · ${todayLabel()}`}
      >
        <PageStack>
          <HomeApiSummaryPanel />
        </PageStack>
      </AppShell>
    </DashboardLayoutProvider>
  );
}

function HomeDemoPage() {
  const { instituteSummary } = useDemoProfile();
  const attendancePending = useMemo(() => loadAttendancePending(), []);
  const attendanceDash = useMemo(
    () =>
      buildAdminAttendanceDashboard({
        notSubmittedCount: attendancePending.length,
        sections: listAttendanceReportSections(),
      }),
    [attendancePending.length],
  );
  const marksEntries = useSyncExternalStore(
    subscribeMarkEntries,
    getMarkEntriesSnapshot,
    getMarkEntriesSnapshot,
  );
  const pendingMarksTeachers = useMemo(
    () => teachersWithPendingMarks(marksEntries),
    [marksEntries],
  );
  const diaryMissing = useMemo(() => {
    const logs = loadDiarySubmissionLogs();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const key = yesterday.toISOString().slice(0, 10);
    const hasYesterday = logs.some((l) => l.date === key);
    return hasYesterday ? 0 : logs.length > 0 ? 1 : 0;
  }, []);

  const pendingReviews = useSyncExternalStore(
    subscribePendingReviews,
    loadPendingReviews,
    () => [],
  );
  const transportSosCount = useSyncExternalStore(
    subscribeTransportEmergencies,
    getActiveTransportEmergencyCount,
    getActiveTransportEmergencyCount,
  );

  const attentionItems = useMemo((): AttentionItem[] => {
    const items: AttentionItem[] = [];

    if (attendancePending.length > 0) {
      items.push({
        id: "att",
        label: "Attendance Not Submitted",
        detail: `${attendancePending.length} class${attendancePending.length === 1 ? "" : "es"} waiting today`,
        count: attendancePending.length,
        to: "/attendance",
        tone: "warning",
        icon: Siren,
      });
    }

    if (diaryMissing > 0) {
      items.push({
        id: "diary",
        label: "Diary Missing",
        detail: "Yesterday’s teacher diary not submitted",
        count: diaryMissing,
        to: "/diary",
        tone: "warning",
        icon: BookMarked,
      });
    }

    const pendingMarkCount = pendingMarksTeachers.reduce((a, t) => a + t.pendingCount, 0);
    if (pendingMarkCount > 0) {
      items.push({
        id: "marks-pending",
        label: "Pending Marks",
        detail: `${pendingMarksTeachers.length} teacher${pendingMarksTeachers.length === 1 ? "" : "s"} still entering`,
        count: pendingMarkCount,
        to: "/marks",
        tone: "warning",
        icon: ClipboardList,
      });
    }

    if (transportSosCount > 0) {
      items.push({
        id: "transport-sos",
        label: "Transport Emergencies",
        detail: "Driver SOS active · open Transport hub to resolve",
        count: transportSosCount,
        to: "/transport",
        search: { view: "emergencies" },
        tone: "danger",
        icon: Bus,
      });
    }

    return items;
  }, [attendancePending.length, diaryMissing, pendingMarksTeachers, transportSosCount]);

  const attentionTotal = attentionItems.reduce((a, i) => a + i.count, 0);

  const widgetBody = (id: string) => {
    switch (id) {
      case "birthdays":
        return <HomeBirthdaysCard />;
      case "diary":
        return <HomeDiaryCard />;
      case "attention":
        return (
          <Card className="border-amber-500/25">
            <CardHeader
              title="Needs Attention"
              hint="Act on these first"
              action={<Pill tone="warning">{attentionTotal} open</Pill>}
            />
            <div className="px-3 pb-3">
              {attentionItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>
              ) : (
              <ul className="space-y-1.5">
                {attentionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <Link
                        to={item.to}
                        search={item.search}
                        className="flex items-center gap-2.5 rounded-lg border border-border bg-background/40 px-2.5 py-2 transition-colors hover:border-border-strong hover:bg-surface-hover"
                      >
                        <IconChip
                          icon={Icon}
                          size="sm"
                          variant={item.tone === "danger" ? "danger" : "brand"}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{item.label}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {item.detail}
                          </span>
                        </span>
                        <Pill tone={item.tone}>{item.count}</Pill>
                        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              )}
            </div>
          </Card>
        );
      case "attendance":
        return (
          <Card>
            <CardHeader
              title={M.attendanceReports}
              hint="Pending · late · coordinator summary"
              action={
                <Link to="/attendance">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    Open
                    <ArrowUpRight className="size-3.5" />
                  </Button>
                </Link>
              }
            />
            <div className="px-3 pb-3">
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                <Link
                  to="/attendance"
                  className="rounded-lg border border-border bg-background/40 px-2.5 py-2 transition-colors hover:border-border-strong hover:bg-surface-hover"
                >
                  <div className="flex items-center gap-2 lx-stat-tile__label">
                    <Siren className="size-3.5 shrink-0" />
                    Attendance Pending
                  </div>
                  <div className="lx-stat-tile__value">
                    {attendanceDash.notSubmittedCount}
                  </div>
                  <p className="lx-stat-tile__hint">Classes waiting today</p>
                </Link>
                <Link
                  to="/attendance"
                  className="rounded-lg border border-border bg-background/40 px-2.5 py-2 transition-colors hover:border-border-strong hover:bg-surface-hover"
                >
                  <div className="flex items-center gap-2 lx-stat-tile__label">
                    <Clock className="size-3.5 shrink-0" />
                    Late Submission
                  </div>
                  <div className="lx-stat-tile__value">
                    {attendanceDash.lateSubmissionCount}
                  </div>
                  <p className="lx-stat-tile__hint">After 10:00 cutoff</p>
                </Link>
                <Link
                  to="/student-attendance"
                  className="rounded-lg border border-border bg-background/40 px-2.5 py-2 transition-colors hover:border-border-strong hover:bg-surface-hover"
                >
                  <div className="flex items-center gap-2 lx-stat-tile__label">
                    <BarChart3 className="size-3.5 shrink-0" />
                    Coordinator Summary
                  </div>
                  <div className="lx-stat-tile__value">
                    {attendanceDash.coordinatorSummary.monthAttendancePct}%
                  </div>
                  <p className="lx-stat-tile__hint">
                    {attendanceDash.coordinatorSummary.completedToday} submitted today ·{" "}
                    {attendanceDash.coordinatorSummary.pendingToday} pending ·{" "}
                    {attendanceDash.coordinatorSummary.alertsQueued} alerts queued
                  </p>
                </Link>
              </div>
            </div>
          </Card>
        );
      case "quick-actions":
        return <HomeQuickActionsCard />;
      case "pending-reviews":
        return (
          <Card>
            <CardHeader
              title="Reviews"
              hint="Decisions waiting on Admin"
              action={
                <Pill tone="info">
                  {pendingReviews.reduce((a, r) => a + r.count, 0)} items
                </Pill>
              }
            />
            <div className="px-3 pb-3">
              {pendingReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending reviews.</p>
              ) : (
              <ul className="space-y-1.5">
                {pendingReviews.map((row) => (
                  <li key={row.id}>
                    <Link
                      to={row.to}
                      search={row.search}
                      className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2 transition-colors hover:bg-surface-hover"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{row.label}</span>
                        <span className="block text-[11px] text-muted-foreground">{row.detail}</span>
                      </span>
                      <Pill tone="warning">{row.count}</Pill>
                      <ArrowUpRight className="size-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
              )}
            </div>
          </Card>
        );
      case "shortcuts":
        return (
          <Card>
            <CardHeader title="Shortcuts" hint="Jump to modules" />
            <div className="px-3 pb-3">
              <div className="flex flex-wrap gap-1.5">
                {SHORTCUTS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <Link key={s.label} to={s.to}>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <Icon className="size-3.5" />
                        {s.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayoutProvider storageKey="admin.home" widgets={ADMIN_HOME_WIDGETS}>
      <AppShell
        title="Home"
        subtitle={`What should I do today? · ${instituteSummary.name} · ${todayLabel()}`}
        titleActions={<DashboardCustomizeActions />}
      >
        <PageStack>
          <DashboardWidgets render={widgetBody} />
        </PageStack>
      </AppShell>
    </DashboardLayoutProvider>
  );
}

function HomePage() {
  if (isApiAuthMode()) return <HomeApiPage />;
  return <HomeDemoPage />;
}
