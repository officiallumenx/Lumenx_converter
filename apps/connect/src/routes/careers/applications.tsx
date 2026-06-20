import { createFileRoute } from "@tanstack/react-router";
import { RequireJobSeekerAuth } from "@/careers-portal/core/guards";
import { ApplicationsListPage } from "@/careers-portal/features/applications/ApplicationsPages";

export const Route = createFileRoute("/careers/applications")({
  head: () => ({ meta: [{ title: "My Applications — Careers" }] }),
  component: ApplicationsRoute,
});

function ApplicationsRoute() {
  return (
    <RequireJobSeekerAuth>
      <ApplicationsListPage />
    </RequireJobSeekerAuth>
  );
}
