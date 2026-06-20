import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { RequireParentAuth } from "@/admissions-portal/core/guards";
import { ApplyWizardPage } from "@/admissions-portal/features/apply/ApplyWizardPage";

const searchSchema = z.object({
  program: z.string().optional(),
  institute: z.string().optional(),
});

export const Route = createFileRoute("/admissions/apply")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Apply — Admissions" }] }),
  component: ApplyRoute,
});

function ApplyRoute() {
  const { program, institute } = Route.useSearch();
  return (
    <RequireParentAuth>
      <ApplyWizardPage programId={program} instituteId={institute} />
    </RequireParentAuth>
  );
}
