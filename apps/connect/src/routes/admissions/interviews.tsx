import { createFileRoute } from "@tanstack/react-router";
import { RequireParentAuth } from "@/admissions-portal/core/guards";
import { InterviewsPage } from "@/admissions-portal/features/interviews/InterviewsPage";

export const Route = createFileRoute("/admissions/interviews")({
  head: () => ({ meta: [{ title: "Interviews — Admissions" }] }),
  component: InterviewsRoute,
});

function InterviewsRoute() {
  return (
    <RequireParentAuth>
      <InterviewsPage />
    </RequireParentAuth>
  );
}
