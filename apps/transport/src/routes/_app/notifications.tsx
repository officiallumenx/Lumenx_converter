import { createFileRoute } from "@tanstack/react-router";

import { APP_NAME } from "@/constants";
import { NotificationsPage } from "@/features/notifications";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: `Notifications — ${APP_NAME}` }] }),
  component: NotificationsRoute,
});

function NotificationsRoute() {
  return <NotificationsPage />;
}
