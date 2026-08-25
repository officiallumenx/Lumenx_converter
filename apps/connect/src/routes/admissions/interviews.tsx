import { createFileRoute, Navigate } from "@tanstack/react-router";
import { RequireParentAuth } from "@/admissions-portal/core/guards";

export const Route = createFileRoute("/admissions/interviews")({
  head: () => ({ meta: [{ title: "Applications — Admissions" }] }),
  component: InterviewsRoute,
});

function InterviewsRoute() {
  return (
    <RequireParentAuth>
      <Navigate to="/admissions/applications" replace />
    </RequireParentAuth>
  );
}
