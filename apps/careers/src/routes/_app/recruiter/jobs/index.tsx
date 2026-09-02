import { createFileRoute } from "@tanstack/react-router";
import { RequireRecruiterAuth } from "@/careers-portal/core/guards";
import { RecruiterJobsPage } from "@/careers-portal/features/recruiter/RecruiterJobsPage";

export const Route = createFileRoute("/_app/recruiter/jobs/")({
  head: () => ({ meta: [{ title: "My Jobs — Recruiter" }] }),
  component: RecruiterJobsRoute,
});

function RecruiterJobsRoute() {
  return (
    <RequireRecruiterAuth>
      <RecruiterJobsPage />
    </RequireRecruiterAuth>
  );
}
