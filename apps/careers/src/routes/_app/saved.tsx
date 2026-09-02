import { createFileRoute } from "@tanstack/react-router";
import { RequireJobSeekerAuth } from "@/careers-portal/core/guards";
import { SavedJobsPage } from "@/careers-portal/features/saved/SavedJobsPage";

export const Route = createFileRoute("/_app/saved")({
  head: () => ({ meta: [{ title: "Saved Jobs — Careers" }] }),
  component: SavedRoute,
});

function SavedRoute() {
  return (
    <RequireJobSeekerAuth>
      <SavedJobsPage />
    </RequireJobSeekerAuth>
  );
}
