import { createFileRoute } from "@tanstack/react-router";
import { RequireRecruiterAuth } from "@/careers-portal/core/guards";
import { RecruiterPostJobPage } from "@/careers-portal/features/recruiter/RecruiterPostJobPage";

export const Route = createFileRoute("/_app/recruiter/jobs/$jobId/edit")({
  head: () => ({ meta: [{ title: "Edit Job — Recruiter" }] }),
  component: RecruiterEditJobRoute,
});

function RecruiterEditJobRoute() {
  const { jobId } = Route.useParams();
  return (
    <RequireRecruiterAuth>
      <RecruiterPostJobPage editJobId={jobId} />
    </RequireRecruiterAuth>
  );
}
