import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { ModuleHero } from "@/components/module-shell";
import { AttendanceHubNav } from "@/components/attendance/AttendanceHubNav";
import { AttendanceHubApiView } from "@/components/attendance/AttendanceHubApiView";
import { RouteChunkFallback } from "@/components/RouteChunkFallback";
import { parseHubView, validateHubViewSearch } from "@/lib/hub-view-search";
import { adminPageTitle } from "@/lib/admin-module-labels";
import { isApiAuthMode } from "@/auth/auth-mode";

export type AttendanceHubView = "monitor" | "reports" | "analytics";

const VIEW_TITLES: Record<AttendanceHubView, string> = {
  monitor: "Attendance Monitor",
  reports: "Attendance Reports",
  analytics: "Attendance Analytics",
};

const VIEW_SUBTITLES: Record<AttendanceHubView, string> = {
  monitor: "Not submitted alerts · class status overview",
  reports: "Daily · Weekly · Monthly · Student · Teacher · Class · Section · tables only",
  analytics: "Attendance Trends · Low Attendance · Frequently Absent · no tables/exports",
};

const ATTENDANCE_VIEW_CONFIG = {
  views: ["monitor", "reports", "analytics"] as const,
  defaultView: "monitor" as const,
};

const AttendanceMonitorView = lazy(() =>
  import("@/components/attendance/views/AttendanceMonitorView").then((m) => ({
    default: m.AttendanceMonitorView,
  })),
);
const AttendanceReportsView = lazy(() =>
  import("@/components/attendance/views/AttendanceReportsView").then((m) => ({
    default: m.AttendanceReportsView,
  })),
);
const AttendanceAnalyticsView = lazy(() =>
  import("@/components/attendance/views/AttendanceAnalyticsView").then((m) => ({
    default: m.AttendanceAnalyticsView,
  })),
);

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: adminPageTitle("/attendance") }] }),
  validateSearch: (search: Record<string, unknown>): { view?: AttendanceHubView } => {
    if (search.view == null || search.view === "") return {};
    return validateHubViewSearch(search, ATTENDANCE_VIEW_CONFIG);
  },
  component: AttendancePage,
  pendingComponent: () => <RouteChunkFallback label="Loading attendance…" />,
});

function AttendancePage() {
  const search = Route.useSearch();
  const view: AttendanceHubView = parseHubView(search.view, ATTENDANCE_VIEW_CONFIG);

  if (isApiAuthMode()) {
    return (
      <AppShell
        title={VIEW_TITLES[view]}
        subtitle={`Read-only · ${VIEW_SUBTITLES[view]}`}
      >
        <ModuleHero
          eyebrow="Academics"
          title={VIEW_TITLES[view]}
          subtitle={`Read-only · ${VIEW_SUBTITLES[view]}`}
        />
        <AttendanceHubNav active={view} />
        <AttendanceHubApiView view={view} />
      </AppShell>
    );
  }

  return (
    <AppShell title={VIEW_TITLES[view]} subtitle={VIEW_SUBTITLES[view]}>
      <ModuleHero
        eyebrow="Academics"
        title={VIEW_TITLES[view]}
        subtitle={VIEW_SUBTITLES[view]}
      />
      <AttendanceHubNav active={view} />
      <Suspense fallback={<RouteChunkFallback label="Loading view…" />}>
        {view === "monitor" ? <AttendanceMonitorView /> : null}
        {view === "reports" ? <AttendanceReportsView /> : null}
        {view === "analytics" ? <AttendanceAnalyticsView /> : null}
      </Suspense>
    </AppShell>
  );
}
