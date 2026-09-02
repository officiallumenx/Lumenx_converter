import { createFileRoute } from "@tanstack/react-router";
import { RequireParentAuth } from "@/admissions-portal/core/guards";
import { MyApplicationsPage } from "@/admissions-portal/features/applications/ApplicationsPages";

export const Route = createFileRoute("/_app/applications")({
  head: () => ({ meta: [{ title: "My Applications — Admissions" }] }),
  component: ApplicationsRoute,
});

function ApplicationsRoute() {
  return (
    <RequireParentAuth>
      <MyApplicationsPage />
    </RequireParentAuth>
  );
}
