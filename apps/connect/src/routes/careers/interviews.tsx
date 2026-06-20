import { createFileRoute } from "@tanstack/react-router";
import { RequireJobSeekerAuth } from "@/careers-portal/core/guards";
import { InterviewsPage } from "@/careers-portal/features/interviews/InterviewsPage";

export const Route = createFileRoute("/careers/interviews")({
  head: () => ({ meta: [{ title: "Interviews — Careers" }] }),
  component: InterviewsRoute,
});

function InterviewsRoute() {
  return (
    <RequireJobSeekerAuth>
      <InterviewsPage />
    </RequireJobSeekerAuth>
  );
}
