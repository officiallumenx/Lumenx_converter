import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { APP_NAME } from "@/constants";
import { RouteLazyFallback } from "@/components/app/RouteLazyFallback";

const RouteSetupPage = lazy(() =>
  import("@/features/route-setup").then((m) => ({
    default: m.RouteSetupPage,
  })),
);

export const Route = createFileRoute("/_app/more/route-setup")({
  head: () => ({ meta: [{ title: `Route Setup — ${APP_NAME}` }] }),
  component: RouteSetupRoute,
});

function RouteSetupRoute() {
  return (
    <Suspense fallback={<RouteLazyFallback />}>
      <RouteSetupPage />
    </Suspense>
  );
}
