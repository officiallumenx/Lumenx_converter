import { createFileRoute } from "@tanstack/react-router";
import { RequireParentAuth } from "@/admissions-portal/core/guards";
import { ApplicantDashboardPage } from "@/admissions-portal/features/dashboard/ApplicantDashboardPage";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Admissions" }] }),
  component: DashboardRoute,
});

function DashboardRoute() {
  return (
    <RequireParentAuth>
      <ApplicantDashboardPage />
    </RequireParentAuth>
  );
}
