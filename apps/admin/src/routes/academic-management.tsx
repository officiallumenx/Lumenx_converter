import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AdminPageTransition } from "@/components/AdminPageTransition";
import { AcademicManagementHubNav } from "@/components/academic-management/AcademicManagementHubNav";
import { AcademicYearsView } from "@/components/academic-management/views/AcademicYearsView";
import { StudentPromotionView } from "@/components/academic-management/views/StudentPromotionView";
import { GraduationView } from "@/components/academic-management/views/GraduationView";
import { StudentStatusView } from "@/components/academic-management/views/StudentStatusView";
import { AcademicSettingsView } from "@/components/academic-management/views/AcademicSettingsView";
import { validateHubViewSearch } from "@/lib/hub-view-search";
import { adminPageTitle } from "@/lib/admin-module-labels";

export type AcademicManagementView =
  | "years"
  | "promotion"
  | "graduation"
  | "status"
  | "settings";

const VIEW_TITLES: Record<AcademicManagementView, string> = {
  years: "Academic Years",
  promotion: "Student Promotion",
  graduation: "Graduation",
  status: "Student Status",
  settings: "Academic Settings",
};

const VIEW_SUBTITLES: Record<AcademicManagementView, string> = {
  years: "Create, activate, archive, and manage academic sessions",
  promotion: "Promote eligible students to the next class",
  graduation: "Pass-out workflow · retain records for 5 years",
  status: "Status catalogue and sample assignments",
  settings: "Attendance · notifications · promotion workflow",
};

const ACADEMIC_VIEW_CONFIG = {
  views: [
    "years",
    "promotion",
    "graduation",
    "status",
    "settings",
  ] as const,
  defaultView: "years" as const,
};

export const Route = createFileRoute("/academic-management")({
  head: () => ({ meta: [{ title: adminPageTitle("/academic-management") }] }),
  validateSearch: (search: Record<string, unknown>) =>
    validateHubViewSearch(search, ACADEMIC_VIEW_CONFIG),
  component: AcademicManagementPage,
});

function AcademicManagementPage() {
  const { view } = Route.useSearch();

  return (
    <AppShell title={VIEW_TITLES[view]} subtitle={VIEW_SUBTITLES[view]}>
      <AcademicManagementHubNav active={view} />
      <AdminPageTransition pageKey={view}>
        {view === "years" && <AcademicYearsView />}
        {view === "promotion" && <StudentPromotionView />}
        {view === "graduation" && <GraduationView />}
        {view === "status" && <StudentStatusView />}
        {view === "settings" && <AcademicSettingsView />}
      </AdminPageTransition>
    </AppShell>
  );
}
