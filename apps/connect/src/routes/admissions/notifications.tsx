import { createFileRoute } from "@tanstack/react-router";
import { RequireAdmissionsAuth } from "@/admissions-portal/core/guards";
import { AdmissionsNotificationsPage } from "@/admissions-portal/features/support/SupportPages";

export const Route = createFileRoute("/admissions/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Admissions" }] }),
  component: NotificationsRoute,
});

function NotificationsRoute() {
  return (
    <RequireAdmissionsAuth>
      <AdmissionsNotificationsPage />
    </RequireAdmissionsAuth>
  );
}
