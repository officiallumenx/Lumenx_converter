import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AttendanceHubNav } from "@/components/attendance/AttendanceHubNav";
import { AttendanceMonitorView } from "@/components/attendance/views/AttendanceMonitorView";
import { AttendanceReportsView } from "@/components/attendance/views/AttendanceReportsView";
import { AttendanceAnalyticsView } from "@/components/attendance/views/AttendanceAnalyticsView";
import { parseHubView, validateHubViewSearch } from "@/lib/hub-view-search";
import { adminPageTitle } from "@/lib/admin-module-labels";

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

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: adminPageTitle("/attendance") }] }),
  validateSearch: (search: Record<string, unknown>): { view?: AttendanceHubView } => {
    if (search.view == null || search.view === "") return {};
    return validateHubViewSearch(search, ATTENDANCE_VIEW_CONFIG);
  },
  component: AttendancePage,
});

function AttendancePage() {
  const search = Route.useSearch();
  const view: AttendanceHubView = parseHubView(search.view, ATTENDANCE_VIEW_CONFIG);

  return (
    <AppShell title={VIEW_TITLES[view]} subtitle={VIEW_SUBTITLES[view]}>
      <AttendanceHubNav active={view} />
      {view === "monitor" ? <AttendanceMonitorView /> : null}
      {view === "reports" ? <AttendanceReportsView /> : null}
      {view === "analytics" ? <AttendanceAnalyticsView /> : null}
    </AppShell>
  );
}
