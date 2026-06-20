import { createFileRoute } from "@tanstack/react-router";
import { RequireRecruiterAuth } from "@/careers-portal/core/guards";
import { RecruiterPostJobPage } from "@/careers-portal/features/recruiter/RecruiterPostJobPage";

export const Route = createFileRoute("/careers/recruiter/jobs/new")({
  head: () => ({ meta: [{ title: "Post Job — Recruiter" }] }),
  component: RecruiterPostJobRoute,
});

function RecruiterPostJobRoute() {
  return (
    <RequireRecruiterAuth>
      <RecruiterPostJobPage />
    </RequireRecruiterAuth>
  );
}
