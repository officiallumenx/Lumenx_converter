import { createFileRoute } from "@tanstack/react-router";
import { RequireJobSeekerAuth } from "@/careers-portal/core/guards";
import { CandidateDashboardPage } from "@/careers-portal/features/dashboard/CandidateDashboardPage";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Careers" }] }),
  component: DashboardRoute,
});

function DashboardRoute() {
  return (
    <RequireJobSeekerAuth>
      <CandidateDashboardPage />
    </RequireJobSeekerAuth>
  );
}
