import { createFileRoute } from "@tanstack/react-router";
import { RequireAdmissionsAuth } from "@/admissions-portal/core/guards";
import { AdmissionsSettingsPage } from "@/admissions-portal/features/support/SupportPages";

export const Route = createFileRoute("/admissions/settings")({
  head: () => ({ meta: [{ title: "Settings — Admissions" }] }),
  component: SettingsRoute,
});

function SettingsRoute() {
  return (
    <RequireAdmissionsAuth>
      <AdmissionsSettingsPage />
    </RequireAdmissionsAuth>
  );
}
