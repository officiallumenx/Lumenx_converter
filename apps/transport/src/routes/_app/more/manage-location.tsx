import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { APP_NAME } from "@/constants";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const ManageLocationPage = lazy(() =>
  import("@/features/manage-location").then((m) => ({
    default: m.ManageLocationPage,
  })),
);

export const Route = createFileRoute("/_app/more/manage-location")({
  head: () => ({ meta: [{ title: `Manage Location — ${APP_NAME}` }] }),
  component: ManageLocationRoute,
});

function ManageLocationRoute() {
  return (
    <Suspense fallback={<RouteLazyFallback />}>
      <ManageLocationPage />
    </Suspense>
  );
}
