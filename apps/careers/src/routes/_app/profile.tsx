import { createFileRoute } from "@tanstack/react-router";
import { RequireJobSeekerAuth } from "@/careers-portal/core/guards";
import { CandidateProfilePage } from "@/careers-portal/features/profile/CandidateProfilePage";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — Careers" }] }),
  component: ProfileRoute,
});

function ProfileRoute() {
  return (
    <RequireJobSeekerAuth>
      <CandidateProfilePage />
    </RequireJobSeekerAuth>
  );
}
