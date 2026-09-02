import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { RequireJobSeekerAuth } from "@/careers-portal/core/guards";
import { ApplyWizardPage } from "@/careers-portal/features/apply/ApplyWizardPage";

const searchSchema = z.object({
  job: z.string().optional(),
});

export const Route = createFileRoute("/_app/apply")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Apply — Careers" }] }),
  component: ApplyRoute,
});

function ApplyRoute() {
  const { job } = Route.useSearch();
  return (
    <RequireJobSeekerAuth>
      <ApplyWizardPage jobId={job} />
    </RequireJobSeekerAuth>
  );
}
