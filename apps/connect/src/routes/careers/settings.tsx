import { createFileRoute } from "@tanstack/react-router";
import { RequireCareersAuth } from "@/careers-portal/core/guards";
import { SettingsPage } from "@/careers-portal/features/support/SupportPages";

export const Route = createFileRoute("/careers/settings")({
  head: () => ({ meta: [{ title: "Settings — Careers" }] }),
  component: SettingsRoute,
});

function SettingsRoute() {
  return (
    <RequireCareersAuth>
      <SettingsPage />
    </RequireCareersAuth>
  );
}
