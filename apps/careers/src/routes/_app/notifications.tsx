import { createFileRoute } from "@tanstack/react-router";
import { RequireJobSeekerAuth } from "@/careers-portal/core/guards";
import { NotificationsPage } from "@/careers-portal/features/support/SupportPages";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Careers" }] }),
  component: NotificationsRoute,
});

function NotificationsRoute() {
  return (
    <RequireJobSeekerAuth>
      <NotificationsPage />
    </RequireJobSeekerAuth>
  );
}
