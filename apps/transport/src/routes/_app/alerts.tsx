import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { APP_NAME } from "@/constants";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const NotificationsPage = lazy(() =>
  import("@/features/notifications").then((m) => ({
    default: m.NotificationsPage,
  })),
);

export const Route = createFileRoute("/_app/alerts")({
  head: () => ({ meta: [{ title: `Alerts — ${APP_NAME}` }] }),
  component: AlertsRoute,
});

function AlertsRoute() {
  return (
    <Suspense fallback={<RouteLazyFallback />}>
      <NotificationsPage
        title="Alerts"
        subtitle="Urgent transport notices, route updates, and school alerts"
      />
    </Suspense>
  );
}
