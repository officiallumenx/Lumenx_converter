import { createFileRoute } from "@tanstack/react-router";
import { RequireJobSeekerAuth } from "@/careers-portal/core/guards";
import { ApplicationDetailPage } from "@/careers-portal/features/applications/ApplicationsPages";

export const Route = createFileRoute("/careers/applications/$applicationId")({
  head: () => ({ meta: [{ title: "Application Details — Careers" }] }),
  component: ApplicationDetailRoute,
});

function ApplicationDetailRoute() {
  const { applicationId } = Route.useParams();
  return (
    <RequireJobSeekerAuth>
      <ApplicationDetailPage applicationId={applicationId} />
    </RequireJobSeekerAuth>
  );
}
