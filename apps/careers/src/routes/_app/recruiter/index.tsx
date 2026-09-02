import { createFileRoute } from "@tanstack/react-router";
import { RequireRecruiterAuth } from "@/careers-portal/core/guards";
import { RecruiterWorkspacePage } from "@/careers-portal/features/recruiter/RecruiterWorkspacePage";

export const Route = createFileRoute("/_app/recruiter/")({
  head: () => ({ meta: [{ title: "Recruiter Workspace — Careers" }] }),
  component: RecruiterRoute,
});

function RecruiterRoute() {
  return (
    <RequireRecruiterAuth>
      <RecruiterWorkspacePage />
    </RequireRecruiterAuth>
  );
}
