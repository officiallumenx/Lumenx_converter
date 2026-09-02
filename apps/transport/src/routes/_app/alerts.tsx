import { createFileRoute } from "@tanstack/react-router";

import { APP_NAME } from "@/constants";
import { NotificationsPage } from "@/features/notifications";

export const Route = createFileRoute("/_app/alerts")({
  head: () => ({ meta: [{ title: `Alerts — ${APP_NAME}` }] }),
  component: AlertsRoute,
});

function AlertsRoute() {
  return (
    <NotificationsPage
      title="Alerts"
      subtitle="Urgent transport notices, route updates, and school alerts"
    />
  );
}
