import { createFileRoute } from "@tanstack/react-router";
import { RequireRecruiterAuth } from "@/careers-portal/core/guards";
import { RecruiterTalentPage } from "@/careers-portal/features/recruiter/RecruiterTalentPage";

export const Route = createFileRoute("/_app/recruiter/talent")({
  head: () => ({ meta: [{ title: "Talent — Recruiter" }] }),
  component: RecruiterTalentRoute,
});

function RecruiterTalentRoute() {
  return (
    <RequireRecruiterAuth>
      <RecruiterTalentPage />
    </RequireRecruiterAuth>
  );
}
