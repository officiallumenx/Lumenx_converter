import { createFileRoute } from "@tanstack/react-router";
import { RequireRecruiterAuth } from "@/careers-portal/core/guards";
import { RecruiterApplicantsPage } from "@/careers-portal/features/recruiter/RecruiterApplicantsPage";

export const Route = createFileRoute("/_app/recruiter/applicants")({
  head: () => ({ meta: [{ title: "Applicants — Recruiter" }] }),
  component: RecruiterApplicantsRoute,
});

function RecruiterApplicantsRoute() {
  return (
    <RequireRecruiterAuth>
      <RecruiterApplicantsPage />
    </RequireRecruiterAuth>
  );
}
